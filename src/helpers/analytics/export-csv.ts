import type { EdgeCachePoint, TimePoint } from '@/shared/types'

const HEADERS = [
  'bucket_start',
  'total_image_requests',
  'edge',
  'cache_optimized',
  'optimized',
  'failed',
  'requests_reaching_keenpix',
  'edge_forwarded_by_cloudflare',
  'source_bytes',
  'delivered_bytes',
  'edge_delivered_bytes',
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
      point.requests + (edgePoint?.hit ?? 0),
      edgePoint?.hit ?? '',
      point.cached,
      point.optimized,
      Math.max(0, point.requests - point.successful),
      point.requests,
      edgePoint?.miss ?? '',
      point.bandwidthIn,
      point.bandwidthOut,
      edgePoint?.bytes ?? '',
      point.bandwidthSaved,
    ]
  })
  return [HEADERS, ...rows].map((row) => row.join(',')).join('\n')
}
