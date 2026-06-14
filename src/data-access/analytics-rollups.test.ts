import dayjs from 'dayjs'
import { describe, expect, it, vi } from 'vitest'
import {
  type RollupRow,
  rollupsToLatencyBins,
  rollupsToTimeSeries,
  summarizeRollups,
} from './analytics-rollups'

function row(overrides: Partial<RollupRow>): RollupRow {
  return {
    bucketStart: dayjs('2026-06-13T10:00:00.000Z').toDate(),
    bytesIn: 1000n,
    bytesOut: 400n,
    bytesSaved: 600n,
    cachedRequests: 1,
    format: 'webp',
    latencyGt1100: 0,
    latencyLe5: 0,
    latencyLe10: 0,
    latencyLe20: 3,
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
    latencyMsSum: 60,
    optimizedRequests: 2,
    path: '/img/https://cdn.example.com/a.jpg',
    projectId: 'store',
    requests: 3,
    sourceHost: 'cdn.example.com',
    status: 200,
    ...overrides,
  }
}

describe('analytics rollup math', () => {
  it('summarizes request, cache, bandwidth, and latency metrics', () => {
    const summary = summarizeRollups([
      row({ requests: 3, cachedRequests: 1, bytesIn: 1000n, bytesOut: 400n }),
      row({
        requests: 2,
        cachedRequests: 2,
        bytesIn: 500n,
        bytesOut: 100n,
        bytesSaved: 400n,
        latencyLe20: 0,
        latencyLe80: 2,
        latencyMsSum: 160,
      }),
    ])

    expect(summary).toMatchObject({
      totalRequests: 5,
      bandwidthIn: 1500,
      bandwidthOut: 500,
      bandwidthSaved: 1000,
      hitRate: 60,
      p50: 20,
      p95: 80,
    })
  })

  it('buckets hourly rollups into the selected chart range', () => {
    vi.useFakeTimers()
    vi.setSystemTime(dayjs('2026-06-13T12:30:00.000Z').toDate())
    try {
      expect(
        rollupsToTimeSeries(
          [
            row({ bucketStart: dayjs('2026-06-13T10:00:00.000Z').toDate() }),
            row({
              bucketStart: dayjs('2026-06-13T11:00:00.000Z').toDate(),
              requests: 4,
              cachedRequests: 3,
              optimizedRequests: 1,
            }),
          ],
          '24h',
        ).slice(-3),
      ).toEqual([
        expect.objectContaining({ label: '10:00', requests: 3, cached: 1 }),
        expect.objectContaining({ label: '11:00', requests: 4, cached: 3 }),
        expect.objectContaining({ label: '12:00', requests: 0, cached: 0 }),
      ])
    } finally {
      vi.useRealTimers()
    }
  })

  it('turns stored histogram columns back into latency chart bins', () => {
    const bins = rollupsToLatencyBins([
      row({ latencyLe20: 3 }),
      row({ latencyLe20: 2, latencyLe120: 4 }),
    ])

    expect(bins.find((b) => b.bucket === 20)).toMatchObject({ value: 5 })
    expect(bins.find((b) => b.bucket === 120)).toMatchObject({ value: 4 })
  })
})
