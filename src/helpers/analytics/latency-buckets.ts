export const LATENCY_BUCKETS = [
  { field: 'latencyLe5', label: '<5ms', max: 5 },
  { field: 'latencyLe10', label: '10', max: 10 },
  { field: 'latencyLe20', label: '20', max: 20 },
  { field: 'latencyLe35', label: '35', max: 35 },
  { field: 'latencyLe55', label: '55', max: 55 },
  { field: 'latencyLe80', label: '80', max: 80 },
  { field: 'latencyLe120', label: '120', max: 120 },
  { field: 'latencyLe180', label: '180', max: 180 },
  { field: 'latencyLe260', label: '260', max: 260 },
  { field: 'latencyLe380', label: '380', max: 380 },
  { field: 'latencyLe540', label: '540', max: 540 },
  { field: 'latencyLe800', label: '800', max: 800 },
  { field: 'latencyLe1100', label: '>1s', max: 1100 },
  { field: 'latencyGt1100', label: '>1s', max: 1600 },
] as const
const MAX_LATENCY_BUCKET = 1600

export type LatencyBucketField = (typeof LATENCY_BUCKETS)[number]['field']
export type LatencyBucketCounts = Record<LatencyBucketField, number>

export function emptyLatencyBucketCounts() {
  return {
    latencyLe5: 0,
    latencyLe10: 0,
    latencyLe20: 0,
    latencyLe35: 0,
    latencyLe55: 0,
    latencyLe80: 0,
    latencyLe120: 0,
    latencyLe180: 0,
    latencyLe260: 0,
    latencyLe380: 0,
    latencyLe540: 0,
    latencyLe800: 0,
    latencyLe1100: 0,
    latencyGt1100: 0,
  }
}

export function latencyBucketField(latencyMs: number) {
  return (
    LATENCY_BUCKETS.find((b) => latencyMs <= b.max)?.field ?? 'latencyGt1100'
  )
}

export function approximateLatencyPercentile(
  counts: LatencyBucketCounts,
  percentile: number,
) {
  const total = LATENCY_BUCKETS.reduce((sum, b) => sum + counts[b.field], 0)
  if (total === 0) {
    return 0
  }
  const target = Math.ceil(total * percentile)
  let seen = 0
  for (const b of LATENCY_BUCKETS) {
    seen += counts[b.field]
    if (seen >= target) {
      return b.max
    }
  }
  return MAX_LATENCY_BUCKET
}
