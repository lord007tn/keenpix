import type { EdgeCachePoint, TimePoint } from '@/shared/types'

const HEADERS = [
  'bucket_start',
  'client_requests_observed_at_cloudflare',
  'served_by_cloudflare_cache',
  'forwarded_by_cloudflare',
  'requests_reaching_keenpix',
  'successful_deliveries',
  'served_from_keenpix_cache',
  'newly_optimized_by_keenpix',
  'failed_requests',
  'source_bytes',
  'delivered_bytes',
  'saved_bytes',
]

export function analyticsSeriesCsv(
  series: TimePoint[],
  edge: EdgeCachePoint[] = [],
) {
  const edgeByStart = new Map(edge.map((point) => [point.start, point]))
  const rows = series.map((point) => {
    const edgePoint = edgeByStart.get(point.start)
    return [
      point.start,
      edgePoint ? edgePoint.hit + edgePoint.miss : '',
      edgePoint?.hit ?? '',
      edgePoint?.miss ?? '',
      point.requests,
      point.successful,
      point.cached,
      point.optimized,
      Math.max(0, point.requests - point.successful),
      point.bandwidthIn,
      point.bandwidthOut,
      point.bandwidthSaved,
    ]
  })
  return [HEADERS, ...rows].map((row) => row.join(',')).join('\n')
}
