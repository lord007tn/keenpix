import dayjs from 'dayjs'
import { describe, expect, it, vi } from 'vitest'
import { emptyLatencyBucketCounts } from './latency-buckets'
import {
  type BucketAgg,
  type BucketStatusAgg,
  domainBreakdown,
  formatDistribution,
  geoDistribution,
  hostTraffic,
  latencyBinsFromAgg,
  latencyTrendFromBuckets,
  projectBreakdown,
  projectStats,
  type RollupSummaryAgg,
  statusSeriesFromBuckets,
  summarizeAgg,
  timeSeriesFromBuckets,
} from './rollup-shapers'

function summary(overrides: Partial<RollupSummaryAgg> = {}): RollupSummaryAgg {
  return {
    requests: 0,
    cachedRequests: 0,
    bytesIn: 0,
    bytesOut: 0,
    bytesSaved: 0,
    latencyMsSum: 0,
    optimizedRequests: 0,
    latency: emptyLatencyBucketCounts(),
    successfulRequests: 0,
    ...overrides,
  }
}

function bucket(overrides: Partial<BucketAgg> = {}): BucketAgg {
  return {
    bucketStart: dayjs('2026-06-13T10:00:00.000Z').toDate(),
    requests: 0,
    cachedRequests: 0,
    optimizedRequests: 0,
    bytesIn: 0,
    bytesOut: 0,
    bytesSaved: 0,
    latency: emptyLatencyBucketCounts(),
    ...overrides,
  }
}

describe('summarizeAgg', () => {
  it('derives totals, hit rate, and percentiles from a summed window', () => {
    const out = summarizeAgg(
      summary({
        requests: 5,
        successfulRequests: 4,
        cachedRequests: 3,
        optimizedRequests: 1,
        bytesIn: 1500,
        bytesOut: 500,
        bytesSaved: 1000,
        latencyMsSum: 220,
        latency: {
          ...emptyLatencyBucketCounts(),
          latencyLe20: 3,
          latencyLe80: 2,
        },
      }),
    )
    expect(out).toMatchObject({
      totalRequests: 5,
      successfulDeliveries: 4,
      liveOptimizations: 1,
      cacheHits: 3,
      failedRequests: 1,
      bandwidthIn: 1500,
      bandwidthOut: 500,
      bandwidthSaved: 1000,
      hitRate: 75,
      avg: 44,
      p50: 20,
      p95: 80,
    })
  })

  it('is all-zero for an empty window', () => {
    expect(summarizeAgg(summary())).toMatchObject({
      totalRequests: 0,
      hitRate: 0,
      savingsPct: 0,
      avg: 0,
      p50: 0,
      p99: 0,
    })
  })
})

describe('latencyBinsFromAgg', () => {
  it('turns the summed histogram into chart bins', () => {
    const bins = latencyBinsFromAgg(
      summary({
        latency: {
          ...emptyLatencyBucketCounts(),
          latencyLe20: 5,
          latencyLe120: 4,
        },
      }),
    )
    expect(bins.find((b) => b.bucket === 20)).toMatchObject({ value: 5 })
    expect(bins.find((b) => b.bucket === 120)).toMatchObject({ value: 4 })
  })
})

describe('timeSeriesFromBuckets', () => {
  it('buckets hourly aggregates into the selected chart range', () => {
    vi.useFakeTimers()
    vi.setSystemTime(dayjs('2026-06-13T12:30:00.000Z').toDate())
    try {
      const series = timeSeriesFromBuckets(
        [
          bucket({ requests: 3, cachedRequests: 1 }),
          bucket({
            bucketStart: dayjs('2026-06-13T11:00:00.000Z').toDate(),
            requests: 4,
            cachedRequests: 3,
            optimizedRequests: 1,
          }),
        ],
        '24h',
      )
      expect(series).toHaveLength(24)
      expect(series.filter((p) => p.requests > 0)).toEqual([
        expect.objectContaining({ requests: 3, cached: 1 }),
        expect.objectContaining({ requests: 4, cached: 3, optimized: 1 }),
      ])
      expect(series.at(-1)).toMatchObject({ requests: 0, cached: 0 })
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('statusSeriesFromBuckets', () => {
  it('splits requests into status classes per time bucket', () => {
    vi.useFakeTimers()
    vi.setSystemTime(dayjs('2026-06-13T12:30:00.000Z').toDate())
    try {
      const at11 = dayjs('2026-06-13T11:00:00.000Z').toDate()
      const rows: BucketStatusAgg[] = [
        { bucketStart: at11, status: 200, requests: 4 },
        { bucketStart: at11, status: 304, requests: 3 },
        { bucketStart: at11, status: 404, requests: 2 },
        { bucketStart: at11, status: 503, requests: 1 },
      ]
      const populated = statusSeriesFromBuckets(rows, '24h').find(
        (p) => p.success + p.redirect + p.clientError + p.serverError > 0,
      )
      expect(populated).toMatchObject({
        success: 4,
        redirect: 3,
        clientError: 2,
        serverError: 1,
      })
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('latencyTrendFromBuckets', () => {
  it('reads p50/p95/p99 per time bucket from histogram columns', () => {
    vi.useFakeTimers()
    vi.setSystemTime(dayjs('2026-06-13T12:30:00.000Z').toDate())
    try {
      const at11 = dayjs('2026-06-13T11:00:00.000Z').toDate()
      const trend = latencyTrendFromBuckets(
        [
          bucket({
            bucketStart: at11,
            latency: { ...emptyLatencyBucketCounts(), latencyLe20: 90 },
          }),
          bucket({
            bucketStart: at11,
            latency: {
              ...emptyLatencyBucketCounts(),
              latencyLe120: 8,
              latencyGt1100: 2,
            },
          }),
        ],
        '24h',
      )
      expect(trend.find((p) => p.p50 > 0)).toMatchObject({
        p50: 20,
        p95: 120,
        p99: 1600,
      })
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('formatDistribution', () => {
  it('shares of requests by format as rounded percentages, sorted desc', () => {
    expect(
      formatDistribution([
        { format: 'webp', requests: 3, saved: 600 },
        { format: 'avif', requests: 1, saved: 200 },
      ]),
    ).toEqual([
      { label: 'WEBP', value: 75, saved: 600, color: 'var(--chart-2)' },
      { label: 'AVIF', value: 25, saved: 200, color: 'var(--chart-1)' },
    ])
  })

  it('falls back to the muted color for unknown formats', () => {
    const [slice] = formatDistribution([
      { format: 'jxl', requests: 1, saved: 0 },
    ])
    expect(slice).toMatchObject({
      label: 'JXL',
      color: 'var(--muted-foreground)',
    })
  })
})

describe('geoDistribution', () => {
  it('folds a missing country into Unknown and ranks by requests', () => {
    expect(
      geoDistribution([
        { country: 'US', requests: 5, saved: 1200 },
        { country: '', requests: 7, saved: 600 },
      ]),
    ).toEqual([
      { country: 'Unknown', requests: 7, saved: 600 },
      { country: 'US', requests: 5, saved: 1200 },
    ])
  })
})

describe('projectStats', () => {
  it('keys request count and hit rate by project id', () => {
    expect(
      projectStats([
        {
          projectId: 'store',
          requests: 4,
          cachedRequests: 2,
          optimizedRequests: 2,
          bytesSaved: 0,
          latencyMsSum: 0,
        },
        {
          projectId: 'blog',
          requests: 5,
          cachedRequests: 1,
          optimizedRequests: 3,
          bytesSaved: 0,
          latencyMsSum: 0,
        },
      ]),
    ).toEqual({
      store: { requests: 4, hitRate: 50 },
      blog: { requests: 5, hitRate: 25 },
    })
  })
})

describe('projectBreakdown', () => {
  it('names from the map and ranks by requests', () => {
    const out = projectBreakdown(
      [
        {
          projectId: 'store',
          requests: 2,
          cachedRequests: 1,
          optimizedRequests: 1,
          bytesSaved: 100,
          latencyMsSum: 40,
        },
        {
          projectId: 'blog',
          requests: 9,
          cachedRequests: 3,
          optimizedRequests: 5,
          bytesSaved: 50,
          latencyMsSum: 90,
        },
      ],
      new Map([
        ['store', 'Storefront'],
        ['blog', 'Blog'],
      ]),
    )
    expect(out.map((r) => [r.name, r.requests, r.avgLatency])).toEqual([
      ['Blog', 9, 10],
      ['Storefront', 2, 20],
    ])
  })
})

describe('domainBreakdown', () => {
  it('drops empty hosts and formats lastSeen', () => {
    const out = domainBreakdown([
      {
        sourceHost: 'cdn.example.com',
        requests: 5,
        cachedRequests: 2,
        optimizedRequests: 2,
        bytesSaved: 100,
        latencyMsSum: 100,
        lastSeen: dayjs('2026-06-13T11:00:00.000Z').toDate(),
      },
      {
        sourceHost: '',
        requests: 99,
        cachedRequests: 0,
        optimizedRequests: 0,
        bytesSaved: 0,
        latencyMsSum: 0,
        lastSeen: null,
      },
    ])
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ domain: 'cdn.example.com', requests: 5 })
    expect(out[0].lastSeen).toBe(
      dayjs('2026-06-13T11:00:00.000Z').format('MMM D, HH:mm'),
    )
  })
})

describe('hostTraffic', () => {
  it('builds a per-host map and skips rows with no captured host', () => {
    const map = hostTraffic([
      {
        sourceHost: 'a.example.com',
        requests: 3,
        cachedRequests: 3,
        optimizedRequests: 0,
        bytesSaved: 0,
        latencyMsSum: 0,
        lastSeen: null,
      },
      {
        sourceHost: '',
        requests: 50,
        cachedRequests: 0,
        optimizedRequests: 0,
        bytesSaved: 0,
        latencyMsSum: 0,
        lastSeen: null,
      },
    ])
    expect([...map.keys()]).toEqual(['a.example.com'])
    expect(map.get('a.example.com')).toMatchObject({
      requests: 3,
      hitRate: 100,
    })
  })
})
