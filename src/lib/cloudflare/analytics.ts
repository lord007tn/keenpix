import dayjs from 'dayjs'
import got from 'got'
import type { EffectiveCloudflareSettings } from '@/data-access/admin/cloudflare'

const CLOUDFLARE_GRAPHQL_URL = 'https://api.cloudflare.com/client/v4/graphql'
const REQUEST_TIMEOUT_MS = 10_000
const IMAGE_PATH_PATTERN = '/img/%'
// Cloudflare's adaptive dataset is capped at a 1-day window on non-enterprise
// plans (it rejects anything wider with a quota error), so each capture covers
// the last 24h; we persist it to build history beyond that.
const WINDOW_HOURS = 24

interface AdaptiveGroup {
  count: number
  dimensions: { cacheStatus: string; datetimeHour?: string }
  sum: { edgeResponseBytes: number }
}

interface CloudflareGraphQLResponse {
  data?: {
    viewer?: {
      zones?: Array<{ httpRequestsAdaptiveGroups?: AdaptiveGroup[] }>
    }
  }
  errors?: Array<{ message?: string }> | null
}

// `byHour` adds the datetimeHour dimension + ordering so one query returns the
// hourly series; the verify check omits it (it only needs to know the call is
// authorized).
function buildQuery(opts: { byHour: boolean; withHost: boolean }) {
  const hostVar = opts.withHost ? ', $host: String!' : ''
  const hostFilter = opts.withHost ? ', clientRequestHTTPHost: $host' : ''
  const hourDim = opts.byHour ? ' datetimeHour' : ''
  const orderBy = opts.byHour ? 'orderBy: [datetimeHour_ASC], ' : ''
  return `query EdgeCache($zoneTag: String!, $since: Time!, $until: Time!, $path: String!${hostVar}) {
    viewer {
      zones(filter: { zoneTag: $zoneTag }) {
        httpRequestsAdaptiveGroups(
          limit: 2000
          ${orderBy}filter: { datetime_geq: $since, datetime_leq: $until, clientRequestPath_like: $path${hostFilter} }
        ) {
          count
          sum { edgeResponseBytes }
          dimensions { cacheStatus${hourDim} }
        }
      }
    }
  }`
}

async function queryAdaptiveGroups(
  settings: EffectiveCloudflareSettings,
  opts: { byHour: boolean; since: string; until: string },
) {
  const withHost = Boolean(settings.host)
  const variables: Record<string, string> = {
    zoneTag: settings.zoneId,
    since: opts.since,
    until: opts.until,
    path: IMAGE_PATH_PATTERN,
  }
  if (settings.host) {
    variables.host = settings.host
  }
  const res = await got
    .post(CLOUDFLARE_GRAPHQL_URL, {
      headers: { authorization: `Bearer ${settings.apiToken}` },
      json: { query: buildQuery({ byHour: opts.byHour, withHost }), variables },
      retry: { limit: 1 },
      throwHttpErrors: false,
      timeout: { request: REQUEST_TIMEOUT_MS },
    })
    .json<CloudflareGraphQLResponse>()
    .catch(() => {
      throw new Error('Could not reach the Cloudflare analytics API.')
    })
  if (res.errors && res.errors.length > 0) {
    throw new Error(
      res.errors[0]?.message || 'Cloudflare analytics query failed.',
    )
  }
  return res.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups ?? []
}

export interface EdgeAdaptiveGroup {
  bytes: number
  cacheStatus: string
  count: number
  datetimeHour: string
}

// Raw hourly /img/* adaptive groups for the last 24h, one per
// (cacheStatus, hour), for persisting into EdgeRollupHourly. Hit/miss
// classification is deferred to read time so it always reflects the current
// CACHED_STATUSES set.
export async function fetchEdgeAdaptiveHourly(
  settings: EffectiveCloudflareSettings,
): Promise<EdgeAdaptiveGroup[]> {
  const groups = await queryAdaptiveGroups(settings, {
    byHour: true,
    since: dayjs().subtract(WINDOW_HOURS, 'hour').toISOString(),
    until: dayjs().toISOString(),
  })
  const out: EdgeAdaptiveGroup[] = []
  for (const g of groups) {
    if (!g.dimensions.datetimeHour) {
      continue
    }
    out.push({
      cacheStatus: g.dimensions.cacheStatus,
      datetimeHour: g.dimensions.datetimeHour,
      count: g.count,
      bytes: g.sum?.edgeResponseBytes ?? 0,
    })
  }
  return out
}

// Validate that the token + zone can actually read analytics (used by the
// Settings "Test connection" button). Throws on auth/zone/permission errors.
export async function verifyCloudflareAccess(
  settings: EffectiveCloudflareSettings,
) {
  await queryAdaptiveGroups(settings, {
    byHour: false,
    since: dayjs().subtract(1, 'hour').toISOString(),
    until: dayjs().toISOString(),
  })
}
