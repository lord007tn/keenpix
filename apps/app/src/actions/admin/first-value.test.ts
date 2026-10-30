import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const read = vi.hoisted(() => vi.fn())
vi.mock('@keenpix/database/activation', () => ({
  getFirstValueFunnelReadout: read,
}))

import { getFirstValueFunnel, getRecentFirstValueFunnel } from './first-value'

describe('first value funnel window', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-10-10T12:00:00Z') })
    read.mockReset()
    read.mockResolvedValue({ days: [] })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('reads half-open UTC days and labels the totals', async () => {
    const funnel = await getFirstValueFunnel({
      from: '2026-10-01T00:00:00Z',
      to: '2026-10-03T00:00:00+00:00',
    })
    expect(read).toHaveBeenCalledExactlyOnceWith({
      fromDay: '2026-10-01',
      toDay: '2026-10-03',
    })
    expect(funnel).toMatchObject({
      definition: 'origin_first_external_image_v1',
      definitionVersion: 1,
      interpretation: 'daily_milestone_totals_not_a_cohort_conversion_rate',
    })
  })

  it('accepts an offset that lands on a UTC midnight', async () => {
    await getFirstValueFunnel({
      from: '2026-10-01T03:00:00+03:00',
      to: '2026-10-02T03:00:00+03:00',
    })
    expect(read).toHaveBeenCalledExactlyOnceWith({
      fromDay: '2026-10-01',
      toDay: '2026-10-02',
    })
  })

  it.each([
    ['a partial from', '2026-10-01T00:00:01Z', '2026-10-02T00:00:00Z'],
    ['a partial to', '2026-10-01T00:00:00Z', '2026-10-02T12:00:00Z'],
    ['an offset boundary', '2026-10-01T00:00:00+03:00', '2026-10-02T00:00:00Z'],
    ['an empty window', '2026-10-01T00:00:00Z', '2026-10-01T00:00:00Z'],
    ['a reversed window', '2026-10-02T00:00:00Z', '2026-10-01T00:00:00Z'],
    ['the incomplete day', '2026-10-09T00:00:00Z', '2026-10-11T00:00:00Z'],
    ['too many days', '2025-10-01T00:00:00Z', '2026-10-03T00:00:00Z'],
    ['an invalid date', 'not-a-date', '2026-10-02T00:00:00Z'],
  ])('refuses %s', async (_name, from, to) => {
    await expect(getFirstValueFunnel({ from, to })).rejects.toThrow()
    expect(read).not.toHaveBeenCalled()
  })

  it('reads the last 30 complete UTC days', async () => {
    await getRecentFirstValueFunnel()
    expect(read).toHaveBeenCalledExactlyOnceWith({
      fromDay: '2026-09-10',
      toDay: '2026-10-10',
    })
  })
})
