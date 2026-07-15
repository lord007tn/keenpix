import type { TimePoint } from '@/shared/types'

const HEADERS = [
  'bucket_start',
  'requests',
  'successful_deliveries',
  'cache_hits',
  'optimized_deliveries',
  'source_bytes',
  'delivered_bytes',
  'saved_bytes',
]

export function analyticsSeriesCsv(series: TimePoint[]) {
  const rows = series.map((point) => [
    point.start,
    point.requests,
    point.successful,
    point.cached,
    point.optimized,
    point.bandwidthIn,
    point.bandwidthOut,
    point.bandwidthSaved,
  ])
  return [HEADERS, ...rows].map((row) => row.join(',')).join('\n')
}
