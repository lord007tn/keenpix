import { PLANS, STANDARD_PLAN_PRICES } from '@/lib/billing/plans'

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
  const averageRevenueCents = PLAN_IDS.reduce(
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
  const paymentCostPerCustomerCents =
    averageRevenueCents * (SAAS_SCALE_MODEL.paymentFeeBasisPoints / 10_000) +
    SAAS_SCALE_MODEL.paymentFixedCents
  const infrastructureCostPerCustomerCents =
    averageIncludedGb *
    SAAS_SCALE_MODEL.utilization *
    SAAS_SCALE_MODEL.infrastructureCostPerDeliveredGbCents
  const variableCostPerCustomerCents =
    paymentCostPerCustomerCents + infrastructureCostPerCustomerCents

  return {
    assumptions: {
      averageIncludedGb,
      averageRevenueCents,
      fixedMonthlyCostCents: SAAS_SCALE_MODEL.fixedMonthlyCostCents,
      infrastructureCostPerDeliveredGbCents:
        SAAS_SCALE_MODEL.infrastructureCostPerDeliveredGbCents,
      paymentFeeBasisPoints: SAAS_SCALE_MODEL.paymentFeeBasisPoints,
      paymentFixedCents: SAAS_SCALE_MODEL.paymentFixedCents,
      planMix: SAAS_SCALE_MODEL.planMix,
      utilization: SAAS_SCALE_MODEL.utilization,
      variableCostPerCustomerCents,
    },
    breakEvenCustomers: Math.ceil(
      SAAS_SCALE_MODEL.fixedMonthlyCostCents /
        (averageRevenueCents - variableCostPerCustomerCents),
    ),
    rows: CUSTOMER_COUNTS.map((customers) => {
      const revenueCents = Math.round(customers * averageRevenueCents)
      const variableCostCents = Math.round(
        customers * variableCostPerCustomerCents,
      )
      const totalCostCents =
        SAAS_SCALE_MODEL.fixedMonthlyCostCents + variableCostCents
      const profitCents = revenueCents - totalCostCents
      return {
        customers,
        grossMarginPct:
          revenueCents > 0 ? (profitCents / revenueCents) * 100 : null,
        profitCents,
        revenueCents,
        totalCostCents,
        variableCostCents,
      }
    }),
  }
}
