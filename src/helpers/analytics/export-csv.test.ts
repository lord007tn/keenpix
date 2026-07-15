import { describe, expect, it } from 'vitest'
import { analyticsSeriesCsv } from './export-csv'

describe('analyticsSeriesCsv', () => {
  it('exports stable machine-readable bucket metrics', () => {
    expect(
      analyticsSeriesCsv([
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
      ]),
    ).toBe(
      [
        'bucket_start,requests,successful_deliveries,cache_hits,optimized_deliveries,source_bytes,delivered_bytes,saved_bytes',
        '2026-07-15T00:00:00.000Z,10,9,6,3,5000,2000,3000',
      ].join('\n'),
    )
  })
})
