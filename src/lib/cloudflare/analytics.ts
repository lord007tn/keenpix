import dayjs from 'dayjs'
import got from 'got'
import { LRUCache } from 'lru-cache'
import type { EffectiveCloudflareSettings } from '@/data-access/admin/cloudflare'
import type { EdgeCachePoint, EdgeCacheStats } from '@/shared/types'

const CLOUDFLARE_GRAPHQL_URL = 'https://api.cloudflare.com/client/v4/graphql'
// Cloudflare cache statuses served from the edge without contacting the origin.
const CACHED_STATUSES = new Set(['hit', 'stale', 'revalidated', 'updating'])
const REQUEST_TIMEOUT_MS = 10_000
const IMAGE_PATH_PATTERN = '/img/%'
// Cloudflare's adaptive dataset is capped at a 1-day window on non-enterprise
// plans (it rejects anything wider with a quota error), so edge analytics always
// covers the last 24h regardless of the dashboard's range selector. One hourly
// query yields both the summary and the time series.
const WINDOW_HOURS = 24

// The adaptive dataset is sampled and rolls up slowly, so a few minutes of
// staleness is fine — and it keeps the analytics page off the network on every
// load.
const STATS_TTL_MS = 5 * 60 * 1000
const statsCache = new LRUCache<string, EdgeCacheStats>({
  max: 32,
  ttl: STATS_TTL_MS,
})

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

// Edge cache hit rate, bytes, status breakdown, and hourly series for /img/*
// over the last 24h. Cached for a few minutes per zone+host to keep API usage
// low.
export async function fetchEdgeCacheStats(
  settings: EffectiveCloudflareSettings,
  opts?: { force?: boolean },
) {
  const cacheKey = `${settings.zoneId}:${settings.host ?? ''}`
  if (!opts?.force) {
    const cached = statsCache.get(cacheKey)
    if (cached) {
      return cached
    }
  }
  const groups = await queryAdaptiveGroups(settings, {
    byHour: true,
    since: dayjs().subtract(WINDOW_HOURS, 'hour').toISOString(),
    until: dayjs().toISOString(),
  })

  let requests = 0
  let cachedRequests = 0
  let bytesFromEdge = 0
  const statusCounts = new Map<string, number>()
  const hourly = new Map<string, { bytes: number; hit: number; miss: number }>()
  for (const g of groups) {
    const isHit = CACHED_STATUSES.has(g.dimensions.cacheStatus)
    const bytes = g.sum?.edgeResponseBytes ?? 0
    requests += g.count
    statusCounts.set(
      g.dimensions.cacheStatus,
      (statusCounts.get(g.dimensions.cacheStatus) ?? 0) + g.count,
    )
    if (isHit) {
      cachedRequests += g.count
      bytesFromEdge += bytes
    }
    const hourKey = g.dimensions.datetimeHour ?? ''
    const bucket = hourly.get(hourKey) ?? { bytes: 0, hit: 0, miss: 0 }
    if (isHit) {
      bucket.hit += g.count
      // EdgeCachePoint.bytes is the bytes *served from the edge*, i.e. hit bytes.
      bucket.bytes += bytes
    } else {
      bucket.miss += g.count
    }
    hourly.set(hourKey, bucket)
  }

  const series: EdgeCachePoint[] = [...hourly.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, b]) => ({
      label: dayjs(hour).format('HH:00'),
      hit: b.hit,
      miss: b.miss,
      bytes: b.bytes,
    }))
  const byStatus = [...statusCounts.entries()]
    .map(([status, count]) => ({ status, requests: count }))
    .sort((a, b) => b.requests - a.requests)

  const stats: EdgeCacheStats = {
    hitRate: requests === 0 ? 0 : (cachedRequests / requests) * 100,
    requests,
    cachedRequests,
    bytesFromEdge,
    byStatus,
    series,
    windowHours: WINDOW_HOURS,
    fetchedAt: dayjs().toISOString(),
  }
  statsCache.set(cacheKey, stats)
  return stats
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
