import { describe, expect, it } from 'vitest'
import { HISTORY_RANGES } from './history-range-picker'

describe('history range presets', () => {
  it('keeps every preset visible and reserves Custom for the calendar popover', () => {
    expect(
      HISTORY_RANGES.map(({ buttonLabel, value }) => [buttonLabel, value]),
    ).toEqual([
      ['24 hours', '24h'],
      ['7 days', '7d'],
      ['30 days', '30d'],
      ['90 days', '90d'],
      ['365 days', '365d'],
      ['All time', 'all'],
      ['Custom', 'custom'],
    ])
  })
})
