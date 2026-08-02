import { describe, expect, it } from 'vitest'
import { getAnalyticsStatusCodes } from './status-filters'

describe('getAnalyticsStatusCodes', () => {
  it('expands outcomes into their HTTP status ranges', () => {
    const codes = getAnalyticsStatusCodes({ outcome: ['client-error'] })

    expect(codes).toHaveLength(100)
    expect(codes?.[0]).toBe(400)
    expect(codes?.at(-1)).toBe(499)
  })

  it('intersects exact statuses with selected outcomes', () => {
    expect(
      getAnalyticsStatusCodes({
        outcome: ['success', 'server-error'],
        status: ['200', '404', '503'],
      }),
    ).toEqual([200, 503])
  })

  it('ignores invalid filter values instead of widening a valid selection', () => {
    expect(
      getAnalyticsStatusCodes({
        outcome: ['not-an-outcome', 'redirect'],
        status: ['304', 'invalid'],
      }),
    ).toEqual([304])
  })
})
