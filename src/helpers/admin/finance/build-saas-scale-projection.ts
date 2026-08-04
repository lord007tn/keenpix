import {
  FOUNDING_CUSTOMER_LIMIT,
  PLANS,
  STANDARD_PLAN_PRICES,
} from '@/lib/billing/plans'

const SAAS_SCALE_MODEL = {
  fixedMonthlyCostCents: 25_000,
  infrastructureCostPerDeliveredGbCents: 0.965,
  paymentFeeBasisPoints: 500,
  paymentFixedCents: 50,
  planMix: { basic: 0.5, pro: 0.35, business: 0.15 },
  utilization: 0.4,
} as const

const CUSTOMER_COUNTS = [1, 10, 50, 100, 250, 500, 1000, 2500, 5000, 10_000]
const PLAN_IDS = ['basic', 'pro', 'business'] as const
const GB = 1024 ** 3

export function buildSaasScaleProjection() {
  const foundingAverageRevenueCents = PLAN_IDS.reduce(
    (total, planId) =>
      total +
      PLANS[planId].priceMonthlyUsd * 100 * SAAS_SCALE_MODEL.planMix[planId],
    0,
  )
  const standardAverageRevenueCents = PLAN_IDS.reduce(
    (total, planId) =>
      total +
      STANDARD_PLAN_PRICES[planId].priceMonthlyUsd *
        100 *
        SAAS_SCALE_MODEL.planMix[planId],
    0,
  )
  const averageIncludedGb = PLAN_IDS.reduce(
    (total, planId) =>
      total +
      (PLANS[planId].includedBandwidthBytes / GB) *
        SAAS_SCALE_MODEL.planMix[planId],
    0,
  )
  const foundingPaymentCostPerCustomerCents =
    foundingAverageRevenueCents *
      (SAAS_SCALE_MODEL.paymentFeeBasisPoints / 10_000) +
    SAAS_SCALE_MODEL.paymentFixedCents
  const standardPaymentCostPerCustomerCents =
    standardAverageRevenueCents *
      (SAAS_SCALE_MODEL.paymentFeeBasisPoints / 10_000) +
    SAAS_SCALE_MODEL.paymentFixedCents
  const infrastructureCostPerCustomerCents =
    averageIncludedGb *
    SAAS_SCALE_MODEL.utilization *
    SAAS_SCALE_MODEL.infrastructureCostPerDeliveredGbCents
  const foundingVariableCostPerCustomerCents =
    foundingPaymentCostPerCustomerCents + infrastructureCostPerCustomerCents
  const standardVariableCostPerCustomerCents =
    standardPaymentCostPerCustomerCents + infrastructureCostPerCustomerCents
  const foundingContributionPerCustomerCents =
    foundingAverageRevenueCents - foundingVariableCostPerCustomerCents
  const standardContributionPerCustomerCents =
    standardAverageRevenueCents - standardVariableCostPerCustomerCents
  const foundingBreakEvenCustomers = Math.ceil(
    SAAS_SCALE_MODEL.fixedMonthlyCostCents /
      foundingContributionPerCustomerCents,
  )
  const breakEvenCustomers =
    foundingBreakEvenCustomers <= FOUNDING_CUSTOMER_LIMIT
      ? foundingBreakEvenCustomers
      : FOUNDING_CUSTOMER_LIMIT +
        Math.ceil(
          (SAAS_SCALE_MODEL.fixedMonthlyCostCents -
            FOUNDING_CUSTOMER_LIMIT * foundingContributionPerCustomerCents) /
            standardContributionPerCustomerCents,
        )

  return {
    assumptions: {
      averageIncludedGb,
      fixedMonthlyCostCents: SAAS_SCALE_MODEL.fixedMonthlyCostCents,
      foundingAverageRevenueCents,
      foundingCustomerLimit: FOUNDING_CUSTOMER_LIMIT,
      foundingVariableCostPerCustomerCents,
      infrastructureCostPerDeliveredGbCents:
        SAAS_SCALE_MODEL.infrastructureCostPerDeliveredGbCents,
      paymentFeeBasisPoints: SAAS_SCALE_MODEL.paymentFeeBasisPoints,
      paymentFixedCents: SAAS_SCALE_MODEL.paymentFixedCents,
      planMix: SAAS_SCALE_MODEL.planMix,
      standardAverageRevenueCents,
      standardVariableCostPerCustomerCents,
      utilization: SAAS_SCALE_MODEL.utilization,
    },
    breakEvenCustomers,
    rows: CUSTOMER_COUNTS.map((customers) => {
      const foundingCustomers = Math.min(customers, FOUNDING_CUSTOMER_LIMIT)
      const standardCustomers = Math.max(customers - FOUNDING_CUSTOMER_LIMIT, 0)
      const revenueCents = Math.round(
        foundingCustomers * foundingAverageRevenueCents +
          standardCustomers * standardAverageRevenueCents,
      )
      const variableCostCents = Math.round(
        foundingCustomers * foundingVariableCostPerCustomerCents +
          standardCustomers * standardVariableCostPerCustomerCents,
      )
      const totalCostCents =
        SAAS_SCALE_MODEL.fixedMonthlyCostCents + variableCostCents
      const profitCents = revenueCents - totalCostCents
      return {
        customers,
        foundingCustomers,
        grossMarginPct:
          revenueCents > 0 ? (profitCents / revenueCents) * 100 : null,
        profitCents,
        revenueCents,
        standardCustomers,
        totalCostCents,
        variableCostCents,
      }
    }),
  }
}
