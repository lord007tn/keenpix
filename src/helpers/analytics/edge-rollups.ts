import dayjs from 'dayjs'
import {
  type RollupBucketing,
  rollupBucketing,
} from '@/data-access/analytics-rollups'
import type {
  AnalyticsRange,
  EdgeCachePoint,
  EdgeCacheStats,
} from '@/shared/types'

// Cloudflare counts revalidated requests as reaching origin, but counts their
// response bytes as cached because the body is still served from the edge.
const REQUEST_OFFLOAD_STATUSES = new Set([
  'hit',
  'ignored',
  'stale',
  'updating',
])
const CACHED_RESPONSE_STATUSES = new Set([
  ...REQUEST_OFFLOAD_STATUSES,
  'revalidated',
])
const HOUR = 3_600_000
const PRESET_WINDOW_HOURS: Record<AnalyticsRange, number> = {
  '24h': 24,
  '7d': 7 * 24,
  '30d': 30 * 24,
  '90d': 90 * 24,
}

export interface EdgeRollupRow {
  bucketStart: Date
  bytes: number
  cacheStatus: string
  count: number
}

// Rebuild EdgeCacheStats from persisted hourly rows, with the time series bucketed
// to the selected range exactly like the origin series (so the funnel/compare
// charts merge by label). Mirrors the live aggregation in
// lib/cloudflare/analytics.ts, just sourced from our own table.
export function reconstructEdgeStats(
  rows: EdgeRollupRow[],
  range: AnalyticsRange | RollupBucketing,
): EdgeCacheStats {
  let requests = 0
  let cachedRequests = 0
  let bytesFromEdge = 0
  const statusCounts = new Map<string, number>()
  const bucketing = typeof range === 'string' ? rollupBucketing(range) : range
  const { n, labelFor, indexFor } = bucketing
  const buckets = Array.from({ length: n }, () => ({
    hit: 0,
    miss: 0,
    bytes: 0,
  }))
  for (const r of rows) {
    const isOffloaded = REQUEST_OFFLOAD_STATUSES.has(r.cacheStatus)
    const isCachedResponse = CACHED_RESPONSE_STATUSES.has(r.cacheStatus)
    requests += r.count
    statusCounts.set(
      r.cacheStatus,
      (statusCounts.get(r.cacheStatus) ?? 0) + r.count,
    )
    const bucket = buckets[indexFor(r.bucketStart)]
    if (isOffloaded) {
      cachedRequests += r.count
      bucket.hit += r.count
    } else {
      bucket.miss += r.count
    }
    if (isCachedResponse) {
      bytesFromEdge += r.bytes
      bucket.bytes += r.bytes
    }
  }
  const series: EdgeCachePoint[] = buckets.map((b, i) => ({
    label: labelFor(i),
    hit: b.hit,
    miss: b.miss,
    bytes: b.bytes,
  }))
  const byStatus = [...statusCounts.entries()]
    .map(([status, count]) => ({ status, requests: count }))
    .sort((a, b) => b.requests - a.requests || a.status.localeCompare(b.status))
  const windowHours =
    typeof range === 'string'
      ? PRESET_WINDOW_HOURS[range]
      : Math.max(
          1,
          Math.round((range.lt.getTime() - range.gte.getTime()) / HOUR),
        )
  return {
    hitRate: requests === 0 ? 0 : (cachedRequests / requests) * 100,
    requests,
    cachedRequests,
    bytesFromEdge,
    byStatus,
    series,
    windowHours,
    fetchedAt: dayjs().toISOString(),
  }
}
