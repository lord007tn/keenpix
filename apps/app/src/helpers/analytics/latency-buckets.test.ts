import { describe, expect, it } from 'vitest'
import {
  approximateLatencyPercentile,
  emptyLatencyBucketCounts,
  latencyBucketField,
} from './latency-buckets'

describe('latency buckets', () => {
  it('maps latencies to bounded histogram buckets', () => {
    expect(latencyBucketField(4)).toBe('latencyLe5')
    expect(latencyBucketField(5)).toBe('latencyLe5')
    expect(latencyBucketField(6)).toBe('latencyLe10')
    expect(latencyBucketField(1200)).toBe('latencyGt1100')
  })

  it('approximates percentiles from bucket counts', () => {
    const counts = emptyLatencyBucketCounts()
    counts.latencyLe20 = 80
    counts.latencyLe120 = 15
    counts.latencyGt1100 = 5

    expect(approximateLatencyPercentile(counts, 0.5)).toBe(20)
    expect(approximateLatencyPercentile(counts, 0.95)).toBe(120)
    expect(approximateLatencyPercentile(counts, 0.99)).toBe(1600)
  })

  it('returns zero for empty histograms', () => {
    expect(approximateLatencyPercentile(emptyLatencyBucketCounts(), 0.95)).toBe(
      0,
    )
  })
})
