import { describe, expect, it } from 'vitest'
import { aggregateRollupIncrements } from './analytics-rollups'
import type { NewRequestLog } from './request-logs'

const TS = new Date('2026-07-10T10:17:23.456Z')

function log(overrides: Partial<NewRequestLog & { ts: Date }> = {}) {
  return {
    orgId: 'org_a',
    projectId: 'proj_a',
    path: '/hero.jpg',
    sourceHost: 'cdn.example.com',
    country: 'DE',
    format: 'webp',
    status: 200,
    cached: false,
    latencyMs: 42,
    bytesIn: 1000,
    bytesOut: 400,
    bytesSaved: 600,
    ts: TS,
    ...overrides,
  }
}

describe('aggregateRollupIncrements', () => {
  it('collapses same-bucket requests into one summed increment', () => {
    const rows = [
      log(),
      log({ cached: true, latencyMs: 3, bytesIn: 0, bytesOut: 400 }),
      log({ latencyMs: 90 }),
    ]
    const increments = aggregateRollupIncrements(rows)
    expect(increments).toHaveLength(1)
    const inc = increments[0]
    expect(inc.requests).toBe(3)
    expect(inc.cachedRequests).toBe(1)
    expect(inc.optimizedRequests).toBe(2)
    expect(inc.bytesOut).toBe(1200)
    expect(inc.latencyMsSum).toBe(42 + 3 + 90)
    // Hour-truncated UTC bucket, matching the old SQL date_trunc('hour', ts).
    expect(inc.bucketStart.toISOString()).toBe('2026-07-10T10:00:00.000Z')
    // One latency observation per bucket boundary crossed.
    expect(inc.latency.latencyLe5).toBe(1)
    expect(inc.latency.latencyLe55).toBe(1)
    expect(inc.latency.latencyLe120).toBe(1)
  })

  it('splits increments on every rollup key dimension', () => {
    const rows = [
      log(),
      log({ path: '/other.jpg' }),
      log({ status: 403 }),
      log({ format: 'avif' }),
      log({ ts: new Date('2026-07-10T11:01:00Z') }),
    ]
    expect(aggregateRollupIncrements(rows)).toHaveLength(5)
  })

  it('normalizes missing host/country to empty strings like the old upsert', () => {
    const [inc] = aggregateRollupIncrements([
      log({ sourceHost: undefined, country: undefined }),
    ])
    expect(inc.sourceHost).toBe('')
    expect(inc.country).toBe('')
  })
})
