import { describe, expect, it } from 'vitest'
import { buildSaasScaleProjection } from './build-saas-scale-projection'

describe('buildSaasScaleProjection', () => {
  it('models the final $9/$29/$69 catalog from 1 to 10,000 customers', () => {
    const projection = buildSaasScaleProjection()

    expect(projection.assumptions.averageRevenueCents).toBe(2500)
    expect(projection.breakEvenCustomers).toBe(12)
    expect(projection.rows[0]).toMatchObject({
      customers: 1,
      revenueCents: 2500,
      totalCostCents: 25_306,
      profitCents: -22_806,
    })
    expect(projection.rows.at(-1)).toMatchObject({
      customers: 10_000,
      revenueCents: 25_000_000,
      totalCostCents: 3_087_400,
      profitCents: 21_912_600,
    })
  })
})
