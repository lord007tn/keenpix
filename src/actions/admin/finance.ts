import dayjs from 'dayjs'
import type { z } from 'zod'
import { getEdgeCacheStats } from '@/actions/analytics'
import { listCustomerAccounts } from '@/data-access/admin/customers'
import {
  getFinanceSettingsRow,
  saveFinanceSettingsRow,
} from '@/data-access/admin/finance-settings'
import {
  aggregatePlatformSummary,
  platformAnalyticsCoverageStart,
} from '@/data-access/admin/platform-analytics'
import { historicalRollupBucketing } from '@/data-access/analytics-rollups'
import {
  calculateOperatingCost,
  type FinanceCostSettings,
} from '@/helpers/admin/finance/calculate-operating-cost'
import type {
  financeSettingsSchema,
  platformAnalyticsSchema,
} from '@/schemas/admin'
import { getPlatformFinance } from './platform-finance'

const EMPTY_SETTINGS: FinanceCostSettings = {
  serverMonthlyCents: 0,
  databaseMonthlyCents: 0,
  observabilityMonthlyCents: 0,
  otherMonthlyCents: 0,
  paymentFeeBasisPoints: 0,
  paymentFixedCents: 0,
  originRequestsMicrodollarsPerMillion: 0,
  originBandwidthMicrodollarsPerGb: 0,
  edgeRequestsMicrodollarsPerMillion: 0,
  edgeBandwidthMicrodollarsPerGb: 0,
}

async function getStoredFinanceSettings() {
  const row = await getFinanceSettingsRow()
  return row
    ? { ...EMPTY_SETTINGS, ...row, configured: true }
    : { ...EMPTY_SETTINGS, configured: false }
}

export async function getFinanceSettings() {
  const settings = await getStoredFinanceSettings()
  return {
    configured: settings.configured,
    paymentPercent: settings.paymentFeeBasisPoints / 100,
    paymentFixed: settings.paymentFixedCents / 100,
    serverMonthly: settings.serverMonthlyCents / 100,
    databaseMonthly: settings.databaseMonthlyCents / 100,
    observabilityMonthly: settings.observabilityMonthlyCents / 100,
    otherMonthly: settings.otherMonthlyCents / 100,
    originRequestsPerMillion:
      settings.originRequestsMicrodollarsPerMillion / 1_000_000,
    originBandwidthPerGb: settings.originBandwidthMicrodollarsPerGb / 1_000_000,
    edgeRequestsPerMillion:
      settings.edgeRequestsMicrodollarsPerMillion / 1_000_000,
    edgeBandwidthPerGb: settings.edgeBandwidthMicrodollarsPerGb / 1_000_000,
  }
}

export async function updateFinanceSettings(
  input: z.output<typeof financeSettingsSchema>,
) {
  await saveFinanceSettingsRow({
    paymentFeeBasisPoints: Math.round(input.paymentPercent * 100),
    paymentFixedCents: Math.round(input.paymentFixed * 100),
    serverMonthlyCents: Math.round(input.serverMonthly * 100),
    databaseMonthlyCents: Math.round(input.databaseMonthly * 100),
    observabilityMonthlyCents: Math.round(input.observabilityMonthly * 100),
    otherMonthlyCents: Math.round(input.otherMonthly * 100),
    originRequestsMicrodollarsPerMillion: Math.round(
      input.originRequestsPerMillion * 1_000_000,
    ),
    originBandwidthMicrodollarsPerGb: Math.round(
      input.originBandwidthPerGb * 1_000_000,
    ),
    edgeRequestsMicrodollarsPerMillion: Math.round(
      input.edgeRequestsPerMillion * 1_000_000,
    ),
    edgeBandwidthMicrodollarsPerGb: Math.round(
      input.edgeBandwidthPerGb * 1_000_000,
    ),
  })
  return getFinanceSettings()
}

export async function addCustomerFinance<
  T extends {
    billing: { mrrCents: number; recurringChargeCount: number }
    usage30d: {
      attemptedRequests: number
      bandwidthBytes: number
      edgeBandwidthBytes: number
      edgeRequests: number
      originAttemptedRequests: number
      originBandwidthBytes: number
      requests: number
    }
  },
>(accounts: T[]) {
  const settings = await getStoredFinanceSettings()
  const fixedCostCents = calculateOperatingCost({
    days: 30,
    edgeBandwidthBytes: 0,
    edgeRequests: 0,
    originBandwidthBytes: 0,
    originRequests: 0,
    settings,
  }).fixedCents
  const hasBandwidth = accounts.some(
    (account) => account.usage30d.bandwidthBytes > 0,
  )
  const hasAttempts = accounts.some(
    (account) => account.usage30d.attemptedRequests > 0,
  )
  const allocationBasis = accounts.map((account) => {
    if (hasBandwidth) {
      return account.usage30d.bandwidthBytes
    }
    if (hasAttempts) {
      return account.usage30d.attemptedRequests
    }
    return 0
  })
  const totalAllocationBasis = allocationBasis.reduce(
    (total, value) => total + value,
    0,
  )
  let lastAllocatedIndex = -1
  for (const [index, value] of allocationBasis.entries()) {
    if (value > 0) {
      lastAllocatedIndex = index
    }
  }
  let allocatedFixedCents = 0

  return accounts.map((account, index) => {
    const cost = calculateOperatingCost({
      days: 0,
      edgeBandwidthBytes: account.usage30d.edgeBandwidthBytes,
      edgeRequests: account.usage30d.edgeRequests,
      originBandwidthBytes: account.usage30d.originBandwidthBytes,
      originRequests: account.usage30d.originAttemptedRequests,
      settings,
    })
    const mrrCents = account.billing.mrrCents
    let fixedShareCents = 0
    if (totalAllocationBasis > 0) {
      fixedShareCents =
        index === lastAllocatedIndex
          ? fixedCostCents - allocatedFixedCents
          : Math.floor(
              fixedCostCents * (allocationBasis[index] / totalAllocationBasis),
            )
    }
    allocatedFixedCents += fixedShareCents
    const paymentCostCents =
      mrrCents > 0
        ? Math.round(
            mrrCents * (settings.paymentFeeBasisPoints / 10_000) +
              settings.paymentFixedCents * account.billing.recurringChargeCount,
          )
        : 0
    const variableCostCents =
      cost.originRequestCents +
      cost.originBandwidthCents +
      cost.edgeRequestCents +
      cost.edgeBandwidthCents
    const costCents = variableCostCents + fixedShareCents + paymentCostCents
    return {
      ...account,
      finance30d: {
        mrrCents,
        allocatedFixedCostCents: settings.configured ? fixedShareCents : null,
        costCents: settings.configured ? costCents : null,
        paymentCostCents: settings.configured ? paymentCostCents : null,
        variableCostCents: settings.configured ? variableCostCents : null,
        contributionCents: settings.configured ? mrrCents - costCents : null,
      },
    }
  })
}

export async function getFinanceDashboard(
  input: z.output<typeof platformAnalyticsSchema>,
) {
  const coverageStart =
    input.range === 'all' ? await platformAnalyticsCoverageStart() : null
  const window = historicalRollupBucketing({ ...input, coverageStart })
  const [originAgg, edgeResult, provider, accounts, settings] =
    await Promise.all([
      aggregatePlatformSummary(window.gte, window.lt),
      getEdgeCacheStats(undefined, input, true),
      getPlatformFinance(window.gte, window.lt),
      listCustomerAccounts(),
      getStoredFinanceSettings(),
    ])
  const edge = edgeResult.edge
  const days = Math.max(1, dayjs(window.lt).diff(window.gte, 'day', true))
  const cost = calculateOperatingCost({
    days,
    edgeBandwidthBytes: edge?.bytesFromEdge ?? 0,
    edgeRequests: edge?.cachedRequests ?? 0,
    originBandwidthBytes: Number(originAgg.bytesOut ?? 0),
    originRequests: originAgg.requests ?? 0,
    settings,
  })
  const paid = accounts.filter((account) => account.billing.mrrCents > 0)
  const paidMrrCents = paid.reduce(
    (total, account) => total + account.billing.mrrCents,
    0,
  )
  const paymentCostCents =
    provider.costCents ??
    (provider.revenueCents !== null && provider.profitCents !== null
      ? provider.revenueCents - provider.profitCents
      : null)
  const netAfterPaymentCents =
    provider.profitCents ??
    (provider.revenueCents !== null && paymentCostCents !== null
      ? provider.revenueCents - paymentCostCents
      : null)
  const actualProfitCents =
    !settings.configured || netAfterPaymentCents === null
      ? null
      : netAfterPaymentCents - cost.totalCents
  const actualTotalCostCents =
    !settings.configured || paymentCostCents === null
      ? null
      : paymentCostCents + cost.totalCents

  return {
    window: {
      from: window.gte.toISOString(),
      to: window.lt.toISOString(),
      days,
    },
    revenue: {
      actualCents: provider.revenueCents,
      orders: provider.orders,
      paidMrrCents,
      paidSubscriptions: paid.length,
      paymentCostCents,
      netAfterPaymentCents,
      source: provider.source,
    },
    cost: { ...cost, actualTotalCents: actualTotalCostCents },
    costModelConfigured: settings.configured,
    profit: {
      actualCents: actualProfitCents,
      marginPct:
        actualProfitCents === null || !provider.revenueCents
          ? null
          : (actualProfitCents / provider.revenueCents) * 100,
      projectedMonthlyCents: settings.configured
        ? paidMrrCents - cost.fixedMonthlyCents
        : null,
    },
    usage: {
      edgeBandwidthBytes: edge?.bytesFromEdge ?? 0,
      edgeCovered: edgeResult.edgeCovered,
      edgeRequests: edge?.cachedRequests ?? 0,
      originBandwidthBytes: Number(originAgg.bytesOut ?? 0),
      originRequests: originAgg.requests ?? 0,
    },
  }
}
