import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import type { RollupRow } from '@/data-access/analytics-rollups'
import {
  domainBreakdown,
  hostTraffic,
  projectBreakdown,
  projectStats,
} from './breakdowns'

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

describe('projectStats', () => {
  it('keys request count and hit rate by project id', () => {
    const out = projectStats([
      row({ projectId: 'store', requests: 4, cachedRequests: 2 }),
      row({ projectId: 'store', requests: 0, cachedRequests: 0 }),
      row({ projectId: 'blog', requests: 5, cachedRequests: 1 }),
    ])

    expect(out).toEqual({
      store: { requests: 4, hitRate: 50 },
      blog: { requests: 5, hitRate: 20 },
    })
  })
})

describe('projectBreakdown', () => {
  it('summarizes per project, names from the map, ranked by requests', () => {
    const names = new Map([
      ['store', 'Storefront'],
      ['blog', 'Blog'],
    ])
    const out = projectBreakdown(
      [
        row({ projectId: 'store', requests: 2, bytesSaved: 100n }),
        row({ projectId: 'blog', requests: 9, bytesSaved: 50n }),
      ],
      names,
    )

    expect(out.map((r) => [r.name, r.requests])).toEqual([
      ['Blog', 9],
      ['Storefront', 2],
    ])
  })

  it('falls back to the project id when no name is mapped', () => {
    const [only] = projectBreakdown([row({ projectId: 'orphan' })], new Map())
    expect(only.name).toBe('orphan')
  })
})

describe('domainBreakdown', () => {
  it('summarizes per source host, drops empty hosts, formats lastSeen', () => {
    const out = domainBreakdown([
      row({
        sourceHost: 'cdn.example.com',
        requests: 4,
        bucketStart: dayjs('2026-06-13T09:00:00.000Z').toDate(),
      }),
      row({
        sourceHost: 'cdn.example.com',
        requests: 1,
        bucketStart: dayjs('2026-06-13T11:00:00.000Z').toDate(),
      }),
      row({ sourceHost: '', requests: 99 }),
    ])

    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ domain: 'cdn.example.com', requests: 5 })
    // lastSeen tracks the most recent bucket (11:00), formatted with dayjs.
    expect(out[0].lastSeen).toBe(
      dayjs('2026-06-13T11:00:00.000Z').format('MMM D, HH:mm'),
    )
  })
})

describe('hostTraffic', () => {
  it('builds a per-host map and skips rows with no captured host', () => {
    const map = hostTraffic([
      row({ sourceHost: 'a.example.com', requests: 3, cachedRequests: 3 }),
      row({ sourceHost: '', requests: 50 }),
    ])

    expect([...map.keys()]).toEqual(['a.example.com'])
    expect(map.get('a.example.com')).toMatchObject({
      requests: 3,
      hitRate: 100,
    })
  })
})
