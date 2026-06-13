import dayjs from 'dayjs'
import got from 'got'
import { LRUCache } from 'lru-cache'
import type { EffectiveCloudflareSettings } from '@/data-access/admin/cloudflare'
import type { AnalyticsRange, EdgeCacheStats } from '@/shared/types'

const CLOUDFLARE_GRAPHQL_URL = 'https://api.cloudflare.com/client/v4/graphql'
// Cloudflare cache statuses served from the edge without contacting the origin.
const CACHED_STATUSES = new Set(['hit', 'stale', 'revalidated', 'updating'])
const REQUEST_TIMEOUT_MS = 10_000
const IMAGE_PATH_PATTERN = '/img/%'

// Cloudflare's Analytics API is sampled and rolls up slowly, so a few minutes
// of staleness is fine — and it keeps the analytics page off the network on
// every load.
const STATS_TTL_MS = 5 * 60 * 1000
const statsCache = new LRUCache<string, EdgeCacheStats>({
  max: 32,
  ttl: STATS_TTL_MS,
})

const RANGE_DAYS: Record<AnalyticsRange, number> = {
  '24h': 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

interface AdaptiveGroup {
  count: number
  dimensions: { cacheStatus: string }
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

function buildQuery(withHost: boolean) {
  const hostVar = withHost ? ', $host: String!' : ''
  const hostFilter = withHost ? ', clientRequestHTTPHost: $host' : ''
  return `query EdgeCache($zoneTag: String!, $since: Time!, $until: Time!, $path: String!${hostVar}) {
    viewer {
      zones(filter: { zoneTag: $zoneTag }) {
        httpRequestsAdaptiveGroups(
          limit: 100
          filter: { datetime_geq: $since, datetime_leq: $until, clientRequestPath_like: $path${hostFilter} }
        ) {
          count
          sum { edgeResponseBytes }
          dimensions { cacheStatus }
        }
      }
    }
  }`
}

function sinceForRange(range: AnalyticsRange) {
  return dayjs().subtract(RANGE_DAYS[range], 'day').toISOString()
}

async function queryAdaptiveGroups(
  settings: EffectiveCloudflareSettings,
  since: string,
  until: string,
) {
  const withHost = Boolean(settings.host)
  const variables: Record<string, string> = {
    zoneTag: settings.zoneId,
    since,
    until,
    path: IMAGE_PATH_PATTERN,
  }
  if (settings.host) {
    variables.host = settings.host
  }
  const res = await got
    .post(CLOUDFLARE_GRAPHQL_URL, {
      headers: { authorization: `Bearer ${settings.apiToken}` },
      json: { query: buildQuery(withHost), variables },
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

// Aggregate edge cache hit rate and bytes for /img/* over the window. Cached
// for a few minutes per zone+range+host to keep API usage low.
export async function fetchEdgeCacheStats(
  settings: EffectiveCloudflareSettings,
  range: AnalyticsRange,
  opts?: { force?: boolean },
) {
  const cacheKey = `${settings.zoneId}:${range}:${settings.host ?? ''}`
  if (!opts?.force) {
    const cached = statsCache.get(cacheKey)
    if (cached) {
      return cached
    }
  }
  const groups = await queryAdaptiveGroups(
    settings,
    sinceForRange(range),
    dayjs().toISOString(),
  )
  let requests = 0
  let cachedRequests = 0
  let bytesFromEdge = 0
  for (const g of groups) {
    requests += g.count
    if (CACHED_STATUSES.has(g.dimensions.cacheStatus)) {
      cachedRequests += g.count
      bytesFromEdge += g.sum?.edgeResponseBytes ?? 0
    }
  }
  const stats: EdgeCacheStats = {
    hitRate: requests === 0 ? 0 : (cachedRequests / requests) * 100,
    requests,
    cachedRequests,
    bytesFromEdge,
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
  await queryAdaptiveGroups(
    settings,
    dayjs().subtract(1, 'hour').toISOString(),
    dayjs().toISOString(),
  )
}
