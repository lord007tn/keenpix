import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import { getHistoryWindowDates, limitHistorySearch } from './window'

describe('limitHistorySearch', () => {
  const now = dayjs('2026-07-15T12:00:00.000Z')

  it('maps a disallowed 365-day Basic request to the 90-day ceiling', () => {
    expect(limitHistorySearch({ range: '365d' }, 90, now)).toEqual({
      range: '90d',
    })
  })

  it('turns all available into the retained Pro window', () => {
    expect(limitHistorySearch({ range: 'all' }, 365, now)).toEqual({
      range: 'custom',
      from: '2025-07-16',
      to: '2026-07-15',
    })
  })

  it('clamps custom dates to the plan boundary', () => {
    expect(
      limitHistorySearch(
        { range: 'custom', from: '2025-01-01', to: '2026-07-15' },
        90,
        now,
      ),
    ).toEqual({
      range: 'custom',
      from: '2026-04-17',
      to: '2026-07-15',
    })
  })

  it('keeps a valid ten-day custom selection unchanged', () => {
    expect(
      limitHistorySearch(
        { range: 'custom', from: '2026-07-06', to: '2026-07-15' },
        365,
        now,
      ),
    ).toEqual({
      range: 'custom',
      from: '2026-07-06',
      to: '2026-07-15',
    })
  })
})

describe('getHistoryWindowDates', () => {
  const now = dayjs('2026-07-15T12:00:00.000Z')

  it('uses inclusive UTC calendar days for custom log searches', () => {
    const window = getHistoryWindowDates(
      { range: 'custom', from: '2026-07-06', to: '2026-07-15' },
      now,
    )

    expect(window.gte?.toISOString()).toBe('2026-07-06T00:00:00.000Z')
    expect(window.lt.toISOString()).toBe('2026-07-16T00:00:00.000Z')
  })
})
