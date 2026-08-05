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

  it('bounds managed custom-domain cost by tier', () => {
    expect(PLANS.basic.customDomains).toBe(0)
    expect(PLANS.pro.customDomains).toBe(1)
    expect(PLANS.business.customDomains).toBe(10)
  })

  it('does not promise undelivered AI credits', () => {
    expect(PLANS.basic.aiCreditsPerMonth).toBe(0)
    expect(PLANS.pro.aiCreditsPerMonth).toBe(0)
    expect(PLANS.business.aiCreditsPerMonth).toBe(0)
  })

  it('keeps team members unlimited on every paid plan', () => {
    expect(PLANS.basic.maxSeats).toBeNull()
    expect(PLANS.pro.maxSeats).toBeNull()
    expect(PLANS.business.maxSeats).toBeNull()
  })

  it('keeps aggregate analytics longer than raw logs on lower tiers', () => {
    expect(PLANS.basic.historyDays).toBe(90)
    expect(PLANS.pro.historyDays).toBe(365)
    expect(PLANS.business.historyDays).toBe(365)
    expect(PLANS.basic.logRetentionDays).toBe(30)
    expect(PLANS.pro.logRetentionDays).toBe(90)
    expect(PLANS.business.logRetentionDays).toBe(365)
  })
})

describe('catalogPricing', () => {
  it('derives monthly cents from the catalog', () => {
    const pricing = catalogPricing()
    expect(pricing.source).toBe('catalog')
    // Monthly = priceMonthlyUsd in cents.
    expect(pricing.plans.basic.month.amountCents).toBe(900)
    expect(pricing.plans.pro.month.amountCents).toBe(1900)
    expect(pricing.plans.pro.month.currency).toBe('usd')
  })

  it('covers every monthly plan', () => {
    const pricing = catalogPricing()
    for (const id of ['basic', 'pro', 'business'] as const) {
      expect(pricing.plans[id].month.amountCents).toBeGreaterThan(0)
    }
  })

  it('switches to the final $9/$29/$69 catalog after the founding cohort', () => {
    const pricing = catalogPricing('standard', 25)

    expect(pricing.phase).toBe('standard')
    expect(pricing.foundingOffer.remaining).toBe(0)
    expect(pricing.plans.basic.month.amountCents).toBe(900)
    expect(pricing.plans.pro.month.amountCents).toBe(2900)
    expect(pricing.plans.business.month.amountCents).toBe(6900)
    expect(pricing.plans.basic.overagePerGbCents).toBe(12)
    expect(pricing.plans.pro.overagePerGbCents).toBe(9)
    expect(pricing.plans.business.overagePerGbCents).toBe(7)
  })
})
