import { describe, expect, it } from 'vitest'
import { buildSaasScaleProjection } from './build-saas-scale-projection'

describe('buildSaasScaleProjection', () => {
  it('blends the founding cohort into the final catalog at scale', () => {
    const projection = buildSaasScaleProjection()

    expect(projection.assumptions.foundingAverageRevenueCents).toBe(1700)
    expect(projection.assumptions.standardAverageRevenueCents).toBe(2500)
    expect(projection.breakEvenCustomers).toBe(18)
    expect(projection.rows[0]).toMatchObject({
      customers: 1,
      foundingCustomers: 1,
      revenueCents: 1700,
      standardCustomers: 0,
      totalCostCents: 25_266,
      profitCents: -23_566,
    })
    expect(projection.rows.at(-1)).toMatchObject({
      customers: 10_000,
      foundingCustomers: 25,
      revenueCents: 24_980_000,
      standardCustomers: 9975,
      totalCostCents: 3_086_400,
      profitCents: 21_893_600,
    })
  })
})
