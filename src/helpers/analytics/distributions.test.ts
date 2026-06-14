import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import type { RollupRow } from '@/data-access/analytics-rollups'
import {
  availableFilters,
  formatDistribution,
  geoDistribution,
  topImages,
} from './distributions'

function row(overrides: Partial<RollupRow>): RollupRow {
  return {
    bucketStart: dayjs('2026-06-13T10:00:00.000Z').toDate(),
    bytesIn: 1000n,
    bytesOut: 400n,
    bytesSaved: 600n,
    cachedRequests: 1,
    country: 'US',
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

describe('formatDistribution', () => {
  it('shares of requests by format as rounded percentages, sorted desc', () => {
    const out = formatDistribution([
      row({ format: 'webp', requests: 3, bytesSaved: 600n }),
      row({ format: 'avif', requests: 1, bytesSaved: 200n }),
    ])

    expect(out).toEqual([
      { label: 'WEBP', value: 75, saved: 600, color: 'var(--chart-2)' },
      { label: 'AVIF', value: 25, saved: 200, color: 'var(--chart-1)' },
    ])
  })

  it('falls back to the muted color for unknown formats', () => {
    const [slice] = formatDistribution([row({ format: 'jxl', requests: 1 })])
    expect(slice).toMatchObject({
      label: 'JXL',
      color: 'var(--muted-foreground)',
    })
  })
})

describe('topImages', () => {
  it('groups by path with both request and byte totals, ranked by requests', () => {
    const out = topImages([
      row({ path: '/img/a.jpg', requests: 2, bytesOut: 100n }),
      row({ path: '/img/a.jpg', requests: 3, bytesOut: 200n }),
      row({ path: '/img/b.jpg', requests: 10, bytesOut: 50n }),
    ])

    expect(out).toEqual([
      { label: '/img/b.jpg', requests: 10, bytes: 50 },
      { label: '/img/a.jpg', requests: 5, bytes: 300 },
    ])
  })

  it('caps the list at 20 paths', () => {
    const rows = Array.from({ length: 25 }, (_, i) =>
      row({ path: `/img/${i}.jpg`, requests: i + 1 }),
    )
    expect(topImages(rows)).toHaveLength(20)
  })
})

describe('geoDistribution', () => {
  it('groups by country and folds a missing country into Unknown', () => {
    const out = geoDistribution([
      row({ country: 'US', requests: 4 }),
      row({ country: '', requests: 7 }),
      row({ country: 'US', requests: 1 }),
    ])

    expect(out).toEqual([
      { country: 'Unknown', requests: 7, saved: 600 },
      { country: 'US', requests: 5, saved: 1200 },
    ])
  })
})

describe('availableFilters', () => {
  it('lists distinct formats/statuses/domains present, dropping empty hosts', () => {
    const out = availableFilters([
      row({ format: 'webp', status: 200, sourceHost: 'b.example.com' }),
      row({ format: 'avif', status: 304, sourceHost: 'a.example.com' }),
      row({ format: 'webp', status: 200, sourceHost: '' }),
    ])

    expect(out).toEqual({
      formats: ['avif', 'webp'],
      statuses: [200, 304],
      domains: ['a.example.com', 'b.example.com'],
    })
  })
})
