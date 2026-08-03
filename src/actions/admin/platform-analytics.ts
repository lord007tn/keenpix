import type { z } from 'zod'
import { listCustomerAccounts } from '@/data-access/admin/customers'
import {
  aggregatePlatformSummary,
  groupPlatformByBucket,
  groupPlatformByOrg,
  platformAnalyticsCoverageStart,
} from '@/data-access/admin/platform-analytics'
import { historicalRollupBucketing } from '@/data-access/analytics-rollups'
import {
  summarizeAgg,
  timeSeriesFromBuckets,
} from '@/helpers/analytics/rollup-shapers'
import type { platformAnalyticsSchema } from '@/schemas/admin'

type PlanBucket = 'free' | 'basic' | 'pro' | 'business'
const PLAN_ORDER: PlanBucket[] = ['business', 'pro', 'basic', 'free']

// Platform-wide analytics for the operator Overview + Analytics dashboards:
// cross-org totals and timeseries plus customer-level distribution derived from
// the same accounts query the Customers list uses.
export async function getPlatformAnalytics(
  input: z.output<typeof platformAnalyticsSchema>,
) {
  const coverageStart =
    input.range === 'all' ? await platformAnalyticsCoverageStart() : null
  const window = historicalRollupBucketing({ ...input, coverageStart })
  const [accounts, summaryAgg, buckets, orgRows] = await Promise.all([
    listCustomerAccounts(),
    aggregatePlatformSummary(window.gte, window.lt),
    groupPlatformByBucket(window.gte, window.lt),
    groupPlatformByOrg(window.gte, window.lt),
  ])
  const nameById = new Map(
    accounts.map((account) => [account.id, account.name]),
  )

  const planCounts: Record<PlanBucket, number> = {
    free: 0,
    basic: 0,
    pro: 0,
    business: 0,
  }
  for (const account of accounts) {
    const plan = account.effectivePlan?.plan ?? 'free'
    planCounts[plan] += 1
  }
  const paidAccounts = accounts.filter(
    (account) =>
      account.billing.source === 'polar' &&
      (account.billing.status === 'active' ||
        account.billing.status === 'trialing'),
  )

  return {
    range: input.range,
    window: {
      from: window.gte.toISOString(),
      to: window.lt.toISOString(),
    },
    summary: summarizeAgg(summaryAgg),
    series: timeSeriesFromBuckets(buckets, window),
    topCustomers: orgRows.map((row) => ({
      id: row.orgId,
      name: nameById.get(row.orgId) ?? row.orgId,
      requests: row.requests,
      cacheHitRate: row.requests > 0 ? row.cachedRequests / row.requests : 0,
      bandwidthBytes: row.bytesOut,
    })),
    planDistribution: PLAN_ORDER.map((plan) => ({
      plan,
      count: planCounts[plan],
    })),
    customerCount: accounts.length,
    activePaidSubscriptionCount: paidAccounts.length,
    paidMrrCents: paidAccounts.reduce(
      (total, account) => total + account.billing.amountCents,
      0,
    ),
    complimentaryCustomerCount: accounts.filter(
      (account) => account.billing.source === 'admin_grant',
    ).length,
    suspendedCount: accounts.filter((account) => account.suspendedAt).length,
    servedCount: accounts.filter(
      (account) => account.effectivePlan && !account.suspendedAt,
    ).length,
  }
}
