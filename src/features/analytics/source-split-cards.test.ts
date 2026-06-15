import { describe, expect, it } from 'vitest'
import type { EdgeCacheStats } from '@/shared/types'
import { reconciledCards } from './source-split-cards'

function edgeStats(over: Partial<EdgeCacheStats>): EdgeCacheStats {
  return {
    byStatus: [],
    bytesFromEdge: 0,
    cachedRequests: 0,
    fetchedAt: '2026-01-01T00:00:00.000Z',
    hitRate: 0,
    requests: 0,
    series: [],
    windowHours: 24,
    ...over,
  }
}

describe('reconciledCards — end-to-end cache hit rate', () => {
  it('stays at or below 100% when keenpix logged far more than reached the edge', () => {
    // Cloudflare: 100.7k client requests, 78.2k served at the edge -> 22.5k
    // reached the origin. keenpix's own logs show 56.9k requests at a 41.3% disk
    // hit rate — more than twice what Cloudflare says reached it. The old formula
    // (edge hits + totalRequests x hitRate) summed to >100%.
    const edge = edgeStats({
      bytesFromEdge: 7_300_000_000,
      cachedRequests: 78_200,
      hitRate: 77.6,
      requests: 100_700,
    })
    const summary = {
      bandwidthOut: 3_600_000_000,
      bandwidthSaved: 10_300_000_000,
      hitRate: 41.3,
      totalRequests: 56_900,
    }

    const card = reconciledCards(edge, summary).find(
      (c) => c.label === 'Cache hit rate',
    )
    const pct = Number.parseFloat(card?.value ?? '0')

    expect(pct).toBeLessThanOrEqual(100)
    // edge 77.6% + disk (9.3k of 100.7k ≈ 9.2%) ≈ 86.9%.
    expect(pct).toBeGreaterThan(80)
    expect(pct).toBeLessThan(90)
    // The disk legend is bounded by what actually reached the origin, never the
    // divergent keenpix total.
    const diskRow = card?.rows.find((r) => r.label === 'From keenpix disk')
    expect(
      Number.parseFloat(diskRow?.value.replace('+', '') ?? '0'),
    ).toBeLessThan(15)
  })

  it('end-to-end equals edge hit rate when the origin disk never hits', () => {
    const edge = edgeStats({
      cachedRequests: 60,
      hitRate: 60,
      requests: 100,
    })
    const summary = {
      bandwidthOut: 1,
      bandwidthSaved: 1,
      hitRate: 0,
      totalRequests: 40,
    }
    const card = reconciledCards(edge, summary).find(
      (c) => c.label === 'Cache hit rate',
    )
    expect(card?.value).toBe('60.0%')
  })
})
