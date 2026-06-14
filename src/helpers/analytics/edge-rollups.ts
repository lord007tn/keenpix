import dayjs from 'dayjs'
import {
  rollupBucketing,
  rollupRangeMeta,
} from '@/data-access/analytics-rollups'
import type {
  AnalyticsRange,
  EdgeCachePoint,
  EdgeCacheStats,
} from '@/shared/types'

// Cloudflare cache statuses served from the edge without contacting the origin.
// Classified at read time so historical rows always reflect the current set.
const CACHED_STATUSES = new Set(['hit', 'stale', 'revalidated', 'updating'])
const HOUR = 3_600_000

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
  range: AnalyticsRange,
): EdgeCacheStats {
  let requests = 0
  let cachedRequests = 0
  let bytesFromEdge = 0
  const statusCounts = new Map<string, number>()
  const { n, labelFor, indexFor } = rollupBucketing(range)
  const buckets = Array.from({ length: n }, () => ({
    hit: 0,
    miss: 0,
    bytes: 0,
  }))
  for (const r of rows) {
    const isHit = CACHED_STATUSES.has(r.cacheStatus)
    requests += r.count
    statusCounts.set(
      r.cacheStatus,
      (statusCounts.get(r.cacheStatus) ?? 0) + r.count,
    )
    const bucket = buckets[indexFor(r.bucketStart)]
    if (isHit) {
      cachedRequests += r.count
      bytesFromEdge += r.bytes
      bucket.hit += r.count
      // EdgeCachePoint.bytes is the bytes served from the edge (hit bytes).
      bucket.bytes += r.bytes
    } else {
      bucket.miss += r.count
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
  const { n: bucketCount, ms } = rollupRangeMeta(range)
  return {
    hitRate: requests === 0 ? 0 : (cachedRequests / requests) * 100,
    requests,
    cachedRequests,
    bytesFromEdge,
    byStatus,
    series,
    windowHours: Math.round((bucketCount * ms) / HOUR),
    fetchedAt: dayjs().toISOString(),
  }
}
