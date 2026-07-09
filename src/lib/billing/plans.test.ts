import { describe, expect, it } from 'vitest'
import {
  BASIC_LOG_LIMIT,
  catalogPricing,
  getPlan,
  isPlanId,
  PLANS,
} from './plans'

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

describe('catalogPricing', () => {
  it('derives monthly (×100) and annual (10 months) cents from the catalog', () => {
    const pricing = catalogPricing()
    expect(pricing.source).toBe('catalog')
    // Monthly = priceMonthlyUsd in cents.
    expect(pricing.plans.basic.month.amountCents).toBe(900)
    expect(pricing.plans.pro.month.amountCents).toBe(1900)
    // Annual = 10 months ("2 months free").
    expect(pricing.plans.basic.year.amountCents).toBe(9000)
    expect(pricing.plans.business.year.amountCents).toBe(29_000)
    expect(pricing.plans.pro.month.currency).toBe('usd')
  })

  it('covers every plan for both intervals', () => {
    const pricing = catalogPricing()
    for (const id of ['basic', 'pro', 'business'] as const) {
      expect(pricing.plans[id].month.amountCents).toBeGreaterThan(0)
      expect(pricing.plans[id].year.amountCents).toBeGreaterThan(0)
    }
  })
})
