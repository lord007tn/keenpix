import { describe, expect, it } from 'vitest'
import { toRequestEventRow } from './events'

describe('toRequestEventRow', () => {
  it('maps a full request into the columnar row (UTC datetime, cached=1)', () => {
    const row = toRequestEventRow({
      id: 'log_1',
      ts: new Date('2026-07-06T03:15:14.123Z'),
      orgId: 'org_a',
      projectId: 'proj_1',
      path: '/hero.jpg',
      sourceHost: 'cdn.example.com',
      width: 1200,
      quality: 82,
      format: 'webp',
      status: 200,
      cached: true,
      latencyMs: 12.5,
      bytesIn: 1000,
      bytesOut: 400,
      bytesSaved: 600,
      region: 'EU',
      country: 'FR',
    })
    expect(row).toEqual({
      id: 'log_1',
      org_id: 'org_a',
      project_id: 'proj_1',
      ts: '2026-07-06 03:15:14.123',
      path: '/hero.jpg',
      source_host: 'cdn.example.com',
      width: 1200,
      quality: 82,
      format: 'webp',
      status: 200,
      cached: 1,
      latency_ms: 12.5,
      bytes_in: 1000,
      bytes_out: 400,
      bytes_saved: 600,
      region: 'EU',
      country: 'FR',
    })
  })

  it('collapses nullable columns to empty string / 0 and cached=0', () => {
    const row = toRequestEventRow({
      id: 'log_2',
      ts: new Date('2026-07-06T00:00:00.000Z'),
      orgId: 'org_a',
      projectId: 'proj_1',
      path: '/a.png',
      format: 'png',
      status: 404,
      cached: false,
      latencyMs: 3,
      bytesIn: 0,
      bytesOut: 0,
      bytesSaved: 0,
    })
    expect(row.source_host).toBe('')
    expect(row.width).toBe(0)
    expect(row.quality).toBe(0)
    expect(row.region).toBe('')
    expect(row.country).toBe('')
    expect(row.cached).toBe(0)
    expect(row.ts).toBe('2026-07-06 00:00:00.000')
  })
})
