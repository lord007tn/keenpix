import { describe, expect, it } from 'vitest'
import { PLAN_SELECTION_FALLBACK_PRICING } from './plan-selection'

describe('plan selection pricing fallback', () => {
  it('matches the standard-only checkout catalog', () => {
    expect(PLAN_SELECTION_FALLBACK_PRICING.phase).toBe('standard')
    expect(PLAN_SELECTION_FALLBACK_PRICING.plans.pro.month.amountCents).toBe(
      2900,
    )
    expect(PLAN_SELECTION_FALLBACK_PRICING.foundingOffer.active).toBe(false)
  })
})
