import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import { analyticsInputSchema } from '@/schemas/analytics'
import { historicalRollupBucketing } from './analytics-rollups'

describe('historicalRollupBucketing', () => {
  const now = dayjs('2026-07-15T12:00:00.000Z')

  it('aligns the 24-hour window to persisted hourly buckets', () => {
    const window = historicalRollupBucketing({ range: '24h' }, now)

    expect(window.gte.toISOString()).toBe('2026-07-14T12:00:00.000Z')
    expect(window.n).toBe(24)
    expect(window.startFor(0)).toBe('2026-07-14T12:00:00.000Z')
  })

  it('uses inclusive calendar dates for a custom window', () => {
    const window = historicalRollupBucketing(
      { range: 'custom', from: '2026-07-01', to: '2026-07-03' },
      now,
    )

    expect(window.gte.toISOString()).toBe('2026-07-01T00:00:00.000Z')
    expect(window.lt.toISOString()).toBe('2026-07-04T00:00:00.000Z')
    expect(window.n).toBe(3)
    expect(window.startFor(0)).toBe('2026-07-01T00:00:00.000Z')
  })

  it('covers the first tenant rollup in a bounded all-time series', () => {
    const window = historicalRollupBucketing(
      {
        range: 'all',
        coverageStart: dayjs('2024-01-10T08:00:00.000Z').toDate(),
      },
      now,
    )

    expect(window.gte.toISOString()).toBe('2024-01-10T00:00:00.000Z')
    expect(window.lt.toISOString()).toBe(now.toISOString())
    expect(window.n).toBeLessThanOrEqual(120)
  })
})

describe('analyticsInputSchema historical windows', () => {
  it('requires both dates for a custom window', () => {
    expect(
      analyticsInputSchema.safeParse({ range: 'custom', from: '2026-07-01' })
        .success,
    ).toBe(false)
  })

  it('accepts all-time and bounded custom windows', () => {
    expect(analyticsInputSchema.safeParse({ range: 'all' }).success).toBe(true)
    expect(
      analyticsInputSchema.safeParse({
        range: 'custom',
        from: '2026-07-01',
        to: '2026-07-15',
      }).success,
    ).toBe(true)
  })
})
