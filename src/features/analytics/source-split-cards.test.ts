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

function summary(over: {
  bandwidthOut: number
  bandwidthSaved: number
  hitRate: number
  totalRequests: number
}) {
  const cacheHits = Math.round((over.totalRequests * over.hitRate) / 100)
  return {
    ...over,
    cacheHits,
    failedRequests: 0,
    liveOptimizations: over.totalRequests - cacheHits,
    successfulDeliveries: over.totalRequests,
  }
}

describe('reconciledCards — end-to-end cache hit rate', () => {
  it('uses one denominator when Keenpix logged more requests than Cloudflare forwarded', () => {
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
    const origin = summary({
      bandwidthOut: 3_600_000_000,
      bandwidthSaved: 10_300_000_000,
      hitRate: 41.3,
      totalRequests: 56_900,
    })

    const card = reconciledCards(edge, origin).find(
      (c) => c.label === 'Cache hit rate',
    )
    const pct = Number.parseFloat(card?.value ?? '0')

    expect(pct).toBeLessThanOrEqual(100)
    // 78.2k edge + 23.5k cache optimized over 78.2k + 56.9k total ≈ 75.3%.
    expect(pct).toBeGreaterThan(75)
    expect(pct).toBeLessThan(76)
    const cacheRow = card?.rows.find((r) => r.label === 'Cache optimized')
    expect(cacheRow?.value).toBe('+17.4%')
  })

  it('end-to-end equals edge hit rate when the origin disk never hits', () => {
    const edge = edgeStats({
      cachedRequests: 60,
      hitRate: 60,
      requests: 100,
    })
    const origin = summary({
      bandwidthOut: 1,
      bandwidthSaved: 1,
      hitRate: 0,
      totalRequests: 40,
    })
    const card = reconciledCards(edge, origin).find(
      (c) => c.label === 'Cache hit rate',
    )
    expect(card?.value).toBe('60.0%')
  })
})

describe('reconciledCards — bandwidth saved', () => {
  it('estimates the edge compression saving from the origin ratio', () => {
    // Origin served 3.6 GB at 10.3 GB saved; the edge delivered 7.3 GB of the
    // same optimized variants, so the estimated edge saving is
    // 7.3 × (10.3 / 3.6) ≈ 20.9 GB.
    const edge = edgeStats({
      bytesFromEdge: 7.3e9,
      cachedRequests: 70,
      hitRate: 70,
      requests: 100,
    })
    const origin = summary({
      bandwidthOut: 3.6e9,
      bandwidthSaved: 10.3e9,
      hitRate: 40,
      totalRequests: 30,
    })
    const card = reconciledCards(edge, origin).find(
      (c) => c.label === 'Bandwidth saved',
    )
    const edgeRow = card?.rows.find((r) => r.label === 'Edge')

    // Edge now carries an estimate instead of the "—" dash.
    expect(edgeRow?.source).toBe('edge')
    expect(edgeRow?.value).toContain('est.')
    expect(edgeRow?.value).not.toBe('—')
    // Estimate-inclusive total gets a split bar and no vs-previous trend.
    expect(card?.bar).toHaveLength(2)
    expect(card?.delta).toBeUndefined()
  })

  it('falls back to the dash when no edge data is available (origin-only)', () => {
    // Zero edge bytes still counts as "edge present" (reconciled), so this is a
    // light guard that the estimate path stays self-consistent at the boundary.
    const edge = edgeStats({ bytesFromEdge: 0, requests: 10 })
    const origin = summary({
      bandwidthOut: 1000,
      bandwidthSaved: 2000,
      hitRate: 50,
      totalRequests: 10,
    })
    const card = reconciledCards(edge, origin).find(
      (c) => c.label === 'Bandwidth saved',
    )
    const edgeRow = card?.rows.find((r) => r.label === 'Edge')
    expect(edgeRow?.value).toBe('~0 B · est.')
  })
})

describe('reconciledCards — delivery totals', () => {
  it('keeps failures out of the app delivery-stage rows', () => {
    const edge = edgeStats({
      bytesFromEdge: 1_000_000,
      cachedRequests: 75,
      hitRate: 75,
      requests: 100,
    })
    const cards = reconciledCards(edge, {
      ...summary({
        bandwidthOut: 2_000_000,
        bandwidthSaved: 4_000_000,
        hitRate: 50,
        totalRequests: 200,
      }),
      failedRequests: 20,
      successfulDeliveries: 180,
      cacheHits: 90,
      liveOptimizations: 90,
    })

    const requestCard = cards.find((card) => card.label === 'Image requests')
    expect(requestCard?.value).toBe('275')
    expect(requestCard?.rows.map((row) => row.label)).toEqual([
      'Edge',
      'Cache optimized',
      'Optimized',
    ])
    expect(requestCard?.rows.map((row) => row.value.split(' · ')[0])).toEqual([
      '75',
      '90',
      '90',
    ])
    expect(
      cards
        .filter((card) => card.label.startsWith('Bandwidth'))
        .flatMap((card) => card.rows.map((row) => row.label)),
    ).not.toContain('keenpix origin')
  })
})
