import { describe, expect, it } from 'vitest'
import { BASIC_LOG_LIMIT, getPlan, isPlanId, PLANS } from './plans'

describe('plan catalog', () => {
  it('maps the three Polar plan ids', () => {
    expect(getPlan('basic')?.name).toBe('Basic')
    expect(getPlan('pro')?.name).toBe('Pro')
    expect(getPlan('business')?.name).toBe('Business')
  })

  it('returns null for an unknown/missing plan (no free included usage)', () => {
    expect(getPlan(undefined)).toBeNull()
    expect(getPlan('enterprise')).toBeNull()
    expect(isPlanId('free')).toBe(false)
  })

  it('included bandwidth + price rise with tier; overage falls', () => {
    expect(PLANS.basic.includedBandwidthBytes).toBeLessThan(
      PLANS.pro.includedBandwidthBytes,
    )
    expect(PLANS.pro.includedBandwidthBytes).toBeLessThan(
      PLANS.business.includedBandwidthBytes,
    )
    expect(PLANS.basic.overagePerGbCents).toBeGreaterThan(
      PLANS.business.overagePerGbCents,
    )
    expect(PLANS.basic.priceMonthlyUsd).toBeLessThan(PLANS.pro.priceMonthlyUsd)
  })

  it('advanced logs/analytics gate to Pro+', () => {
    expect(PLANS.basic.advancedLogs).toBe(false)
    expect(PLANS.pro.advancedLogs).toBe(true)
    expect(BASIC_LOG_LIMIT).toBe(200)
  })
})
