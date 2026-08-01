import dayjs from 'dayjs'
import { describe, expect, it, vi } from 'vitest'
import {
  type EdgeRollupRow,
  hasContinuousEdgeCoverage,
  reconstructEdgeStats,
} from './edge-rollups'

const at11 = dayjs('2026-06-13T11:00:00.000Z').toDate()

describe('reconstructEdgeStats', () => {
  it.each([
    { cacheStatus: 'hit', cachedRequests: 1, bytesFromEdge: 100 },
    { cacheStatus: 'stale', cachedRequests: 1, bytesFromEdge: 100 },
    { cacheStatus: 'updating', cachedRequests: 1, bytesFromEdge: 100 },
    { cacheStatus: 'ignored', cachedRequests: 1, bytesFromEdge: 100 },
    { cacheStatus: 'revalidated', cachedRequests: 0, bytesFromEdge: 100 },
    { cacheStatus: 'miss', cachedRequests: 0, bytesFromEdge: 0 },
    { cacheStatus: 'expired', cachedRequests: 0, bytesFromEdge: 0 },
    { cacheStatus: 'bypass', cachedRequests: 0, bytesFromEdge: 0 },
    { cacheStatus: 'dynamic', cachedRequests: 0, bytesFromEdge: 0 },
    { cacheStatus: 'none', cachedRequests: 0, bytesFromEdge: 0 },
  ])('classifies $cacheStatus request offload and cached response bytes', ({
    cacheStatus,
    cachedRequests,
    bytesFromEdge,
  }) => {
    vi.useFakeTimers()
    vi.setSystemTime(dayjs('2026-06-13T12:30:00.000Z').toDate())
    try {
      const stats = reconstructEdgeStats(
        [{ bucketStart: at11, cacheStatus, count: 1, bytes: 100 }],
        '24h',
      )

      expect(stats.cachedRequests).toBe(cachedRequests)
      expect(stats.bytesFromEdge).toBe(bytesFromEdge)
      expect(stats.series.reduce((sum, point) => sum + point.hit, 0)).toBe(
        cachedRequests,
      )
      expect(stats.series.reduce((sum, point) => sum + point.miss, 0)).toBe(
        1 - cachedRequests,
      )
      expect(stats.series.reduce((sum, point) => sum + point.bytes, 0)).toBe(
        bytesFromEdge,
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('classifies hit/miss, totals, byStatus, and a range-bucketed series', () => {
    vi.useFakeTimers()
    vi.setSystemTime(dayjs('2026-06-13T12:30:00.000Z').toDate())
    try {
      const rows: EdgeRollupRow[] = [
        { bucketStart: at11, cacheStatus: 'hit', count: 8, bytes: 1000 },
        { bucketStart: at11, cacheStatus: 'stale', count: 2, bytes: 200 },
        { bucketStart: at11, cacheStatus: 'miss', count: 3, bytes: 50 },
        { bucketStart: at11, cacheStatus: 'expired', count: 1, bytes: 20 },
      ]
      const stats = reconstructEdgeStats(rows, '24h')

      // hit + stale are edge-served; miss + expired reached the origin.
      expect(stats.requests).toBe(14)
      expect(stats.cachedRequests).toBe(10)
      expect(stats.bytesFromEdge).toBe(1200)
      expect(Math.round(stats.hitRate)).toBe(71) // 10/14
      expect(stats.windowHours).toBe(24)

      expect(stats.byStatus).toEqual([
        { status: 'hit', requests: 8 },
        { status: 'miss', requests: 3 },
        { status: 'stale', requests: 2 },
        { status: 'expired', requests: 1 },
      ])

      expect(stats.series).toHaveLength(24)
      const populated = stats.series.filter((p) => p.hit + p.miss > 0)
      expect(populated).toEqual([
        expect.objectContaining({ hit: 10, miss: 4, bytes: 1200 }),
      ])
    } finally {
      vi.useRealTimers()
    }
  })

  it('is all-zero with no rows', () => {
    vi.useFakeTimers()
    vi.setSystemTime(dayjs('2026-06-13T12:30:00.000Z').toDate())
    try {
      const stats = reconstructEdgeStats([], '24h')
      expect(stats.requests).toBe(0)
      expect(stats.hitRate).toBe(0)
      expect(stats.series).toHaveLength(24)
      expect(stats.series.every((p) => p.hit === 0 && p.miss === 0)).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('buckets hourly rows into a wider range (7d → 7 daily buckets)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(dayjs('2026-06-13T12:30:00.000Z').toDate())
    try {
      const stats = reconstructEdgeStats(
        [
          {
            bucketStart: dayjs('2026-06-12T09:00:00.000Z').toDate(),
            cacheStatus: 'hit',
            count: 5,
            bytes: 500,
          },
          {
            bucketStart: dayjs('2026-06-10T15:00:00.000Z').toDate(),
            cacheStatus: 'hit',
            count: 3,
            bytes: 300,
          },
        ],
        '7d',
      )
      expect(stats.series).toHaveLength(7)
      expect(stats.requests).toBe(8)
      expect(stats.cachedRequests).toBe(8)
      expect(stats.bytesFromEdge).toBe(800)
      expect(stats.series.reduce((s, p) => s + p.hit, 0)).toBe(8)
      expect(stats.windowHours).toBe(168)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('hasContinuousEdgeCoverage', () => {
  const gte = dayjs('2026-07-01T00:00:00.000Z').toDate()
  const lt = dayjs('2026-07-31T00:00:00.000Z').toDate()
  const grace = 16 * 60 * 1000

  it('accepts adjacent source intervals that cover the full window', () => {
    expect(
      hasContinuousEdgeCoverage(
        [
          {
            coveredFrom: dayjs('2026-06-14T00:00:00.000Z').toDate(),
            coveredUntil: dayjs('2026-07-17T00:00:00.000Z').toDate(),
          },
          {
            coveredFrom: dayjs('2026-07-17T00:10:00.000Z').toDate(),
            coveredUntil: dayjs('2026-08-01T00:00:00.000Z').toDate(),
          },
        ],
        gte,
        lt,
        grace,
      ),
    ).toBe(true)
  })

  it('rejects a gap between historical and current capture sources', () => {
    expect(
      hasContinuousEdgeCoverage(
        [
          {
            coveredFrom: dayjs('2026-06-14T00:00:00.000Z').toDate(),
            coveredUntil: dayjs('2026-07-27T00:00:00.000Z').toDate(),
          },
          {
            coveredFrom: dayjs('2026-07-31T00:00:00.000Z').toDate(),
            coveredUntil: dayjs('2026-08-01T00:00:00.000Z').toDate(),
          },
        ],
        gte,
        lt,
        grace,
      ),
    ).toBe(false)
  })
})
