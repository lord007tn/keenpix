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
        'bucket_start,total_image_requests,edge,cache_optimized,optimized,failed,requests_reaching_keenpix,edge_forwarded_by_cloudflare,source_bytes,delivered_bytes,edge_delivered_bytes,saved_bytes',
        '2026-07-15T00:00:00.000Z,22,12,6,3,1,10,4,5000,2000,900,3000',
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
    expect(total('total_image_requests')).toBe(62)
    expect(total('edge')).toBe(32)
    expect(total('edge_forwarded_by_cloudflare')).toBe(11)
    expect(total('requests_reaching_keenpix')).toBe(30)
    expect(total('cache_optimized')).toBe(14)
    expect(total('optimized')).toBe(13)
  })
})
