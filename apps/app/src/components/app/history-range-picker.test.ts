import { describe, expect, it } from 'vitest'
import {
  getHistoryShortcutDates,
  HISTORY_SHORTCUTS,
  PRIMARY_HISTORY_RANGES,
} from './history-range-picker'

describe('history range presets', () => {
  it('keeps 24 hours, 7 days, and 30 days in the primary strip', () => {
    expect(
      PRIMARY_HISTORY_RANGES.map(({ buttonLabel, value }) => [
        buttonLabel,
        value,
      ]),
    ).toEqual([
      ['24 hours', '24h'],
      ['7 days', '7d'],
      ['30 days', '30d'],
    ])
  })

  it('offers calendar shortcuts in the custom panel', () => {
    expect(HISTORY_SHORTCUTS.map(({ label }) => label)).toEqual([
      'Current billing period',
      'Previous billing period',
      '2 billing periods ago',
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

  it('calculates billing periods from the real subscription anchor', () => {
    const earliest = '2026-03-01'
    const today = '2026-07-17'
    const billingPeriodStart = '2026-07-08T00:00:00.000Z'

    expect(
      getHistoryShortcutDates(
        'current-billing-period',
        earliest,
        today,
        billingPeriodStart,
      ),
    ).toEqual({ from: '2026-07-08', to: today })
    expect(
      getHistoryShortcutDates(
        'previous-billing-period',
        earliest,
        today,
        billingPeriodStart,
      ),
    ).toEqual({ from: '2026-06-08', to: '2026-07-07' })
    expect(
      getHistoryShortcutDates(
        'two-billing-periods-ago',
        earliest,
        today,
        billingPeriodStart,
      ),
    ).toEqual({ from: '2026-05-08', to: '2026-06-07' })
  })

  it('falls back to calendar billing periods without a customer anchor', () => {
    const earliest = '2025-01-01'
    const today = '2026-01-03'

    expect(
      getHistoryShortcutDates('current-billing-period', earliest, today),
    ).toEqual({ from: '2026-01-01', to: today })
    expect(
      getHistoryShortcutDates('previous-billing-period', earliest, today),
    ).toEqual({ from: '2025-12-01', to: '2025-12-31' })
  })
})
