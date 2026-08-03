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
    billing: { amountCents: number; source: string; status: string | null }
    usage30d: { bandwidthBytes: number; requests: number }
  },
>(accounts: T[]) {
  const settings = await getStoredFinanceSettings()
  return accounts.map((account) => {
    const cost = calculateOperatingCost({
      days: 0,
      edgeBandwidthBytes: 0,
      edgeRequests: 0,
      originBandwidthBytes: account.usage30d.bandwidthBytes,
      originRequests: account.usage30d.requests,
      settings,
    })
    const mrrCents =
      account.billing.source === 'polar' &&
      (account.billing.status === 'active' ||
        account.billing.status === 'trialing')
        ? account.billing.amountCents
        : 0
    const directCostCents = cost.originRequestCents + cost.originBandwidthCents
    return {
      ...account,
      finance30d: {
        mrrCents,
        directCostCents: settings.configured ? directCostCents : null,
        contributionCents: settings.configured
          ? mrrCents - directCostCents
          : null,
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
      getEdgeCacheStats(input, true),
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
  const paid = accounts.filter(
    (account) =>
      account.billing.source === 'polar' &&
      (account.billing.status === 'active' ||
        account.billing.status === 'trialing'),
  )
  const paidMrrCents = paid.reduce(
    (total, account) => total + account.billing.amountCents,
    0,
  )
  const actualProfitCents =
    provider.revenueCents === null
      ? null
      : provider.revenueCents - cost.totalCents

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
      source: provider.source,
    },
    cost,
    costModelConfigured: settings.configured,
    profit: {
      actualCents: actualProfitCents,
      marginPct:
        actualProfitCents === null || !provider.revenueCents
          ? null
          : (actualProfitCents / provider.revenueCents) * 100,
      projectedMonthlyCents: paidMrrCents - cost.fixedMonthlyCents,
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
