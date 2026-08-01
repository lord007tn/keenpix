import { describe, expect, it } from 'vitest'
import { analyticsSeriesCsv } from './export-csv'

describe('analyticsSeriesCsv', () => {
  it('exports stable machine-readable bucket metrics', () => {
    expect(
      analyticsSeriesCsv(
        [
          {
            start: '2026-07-15T00:00:00.000Z',
            label: 'Jul 15',
            requests: 10,
            successful: 9,
            cached: 6,
            optimized: 3,
            bandwidthIn: 5000,
            bandwidthOut: 2000,
            bandwidthSaved: 3000,
          },
        ],
        [
          {
            start: '2026-07-15T00:00:00.000Z',
            label: 'Jul 15',
            hit: 12,
            miss: 4,
            bytes: 900,
          },
        ],
      ),
    ).toBe(
      [
        'bucket_start,client_requests_observed_at_cloudflare,served_by_cloudflare_cache,forwarded_by_cloudflare,requests_reaching_keenpix,successful_deliveries,served_from_keenpix_cache,newly_optimized_by_keenpix,failed_requests,source_bytes,delivered_bytes,saved_bytes',
        '2026-07-15T00:00:00.000Z,16,12,4,10,9,6,3,1,5000,2000,3000',
      ].join('\n'),
    )
  })

  it('keeps edge and origin totals aligned with exported buckets', () => {
    const csv = analyticsSeriesCsv(
      [
        {
          start: '2026-07-15T00:00:00.000Z',
          label: 'Jul 15',
          requests: 10,
          successful: 9,
          cached: 6,
          optimized: 3,
          bandwidthIn: 5000,
          bandwidthOut: 2000,
          bandwidthSaved: 3000,
        },
        {
          start: '2026-07-16T00:00:00.000Z',
          label: 'Jul 16',
          requests: 20,
          successful: 18,
          cached: 8,
          optimized: 10,
          bandwidthIn: 9000,
          bandwidthOut: 4000,
          bandwidthSaved: 5000,
        },
      ],
      [
        {
          start: '2026-07-15T00:00:00.000Z',
          label: 'Jul 15',
          hit: 12,
          miss: 4,
          bytes: 900,
        },
        {
          start: '2026-07-16T00:00:00.000Z',
          label: 'Jul 16',
          hit: 20,
          miss: 7,
          bytes: 1800,
        },
      ],
    )
    const [header, ...rows] = csv.split('\n').map((row) => row.split(','))
    const columns = new Map(header?.map((name, index) => [name, index]))
    const total = (name: string) =>
      rows.reduce(
        (sum, row) => sum + Number(row[columns.get(name) ?? -1] ?? 0),
        0,
      )

    expect(rows).toHaveLength(2)
    expect(total('client_requests_observed_at_cloudflare')).toBe(43)
    expect(total('served_by_cloudflare_cache')).toBe(32)
    expect(total('forwarded_by_cloudflare')).toBe(11)
    expect(total('requests_reaching_keenpix')).toBe(30)
    expect(total('served_from_keenpix_cache')).toBe(14)
    expect(total('newly_optimized_by_keenpix')).toBe(13)
  })
})
