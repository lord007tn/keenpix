import { describe, expect, it } from 'vitest'
import {
  getHistoryShortcutDates,
  HISTORY_SHORTCUTS,
  PRIMARY_HISTORY_RANGES,
} from './history-range-picker'

describe('history range presets', () => {
  it('keeps only 7 and 30 days in the primary strip', () => {
    expect(
      PRIMARY_HISTORY_RANGES.map(({ buttonLabel, value }) => [
        buttonLabel,
        value,
      ]),
    ).toEqual([
      ['7 days', '7d'],
      ['30 days', '30d'],
    ])
  })

  it('offers calendar shortcuts in the custom panel', () => {
    expect(HISTORY_SHORTCUTS.map(({ label }) => label)).toEqual([
      'Last 24 hours',
      'Today',
      'Yesterday',
      'This week',
      'Last 7 days',
      'Last 30 days',
      'This month',
      'Last month',
      'Last 90 days',
      'Last 365 days',
      'Year to date',
      'Last calendar year',
      'All available',
    ])
  })

  it('calculates inclusive calendar boundaries from a fixed date', () => {
    const earliest = '2025-07-18'
    const today = '2026-07-17'

    expect(getHistoryShortcutDates('yesterday', earliest, today)).toEqual({
      from: '2026-07-16',
      to: '2026-07-16',
    })
    expect(getHistoryShortcutDates('30d', earliest, today)).toEqual({
      from: '2026-06-18',
      to: today,
    })
    expect(getHistoryShortcutDates('last-month', earliest, today)).toEqual({
      from: '2026-06-01',
      to: '2026-06-30',
    })
    expect(getHistoryShortcutDates('year-to-date', earliest, today)).toEqual({
      from: '2026-01-01',
      to: today,
    })
    expect(
      getHistoryShortcutDates('last-calendar-year', earliest, today),
    ).toEqual({
      from: '2025-01-01',
      to: '2025-12-31',
    })
  })
})
