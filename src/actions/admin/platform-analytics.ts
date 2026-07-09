import { listCustomerAccounts } from '@/data-access/admin/customers'
import {
  aggregatePlatformSummary,
  groupPlatformByBucket,
  groupPlatformByOrg,
} from '@/data-access/admin/platform-analytics'
import { rollupSinceFor } from '@/data-access/analytics-rollups'
import {
  summarizeAgg,
  timeSeriesFromBuckets,
} from '@/helpers/analytics/rollup-shapers'
import type { AnalyticsRange } from '@/shared/types'

type PlanBucket = 'none' | 'basic' | 'pro' | 'business'
const PLAN_ORDER: PlanBucket[] = ['business', 'pro', 'basic', 'none']

// Platform-wide analytics for the operator Overview + Analytics dashboards:
// cross-org totals and timeseries plus customer-level distribution derived from
// the same accounts query the Customers list uses.
export async function getPlatformAnalytics(range: AnalyticsRange) {
  const gte = rollupSinceFor(range)
  const [accounts, summaryAgg, buckets, orgRows] = await Promise.all([
    listCustomerAccounts(),
    aggregatePlatformSummary(gte),
    groupPlatformByBucket(gte),
    groupPlatformByOrg(gte),
  ])
  const nameById = new Map(
    accounts.map((account) => [account.id, account.name]),
  )

  const planCounts: Record<PlanBucket, number> = {
    none: 0,
    basic: 0,
    pro: 0,
    business: 0,
  }
  for (const account of accounts) {
    const plan = account.effectivePlan?.plan ?? 'none'
    planCounts[plan] += 1
  }

  return {
    range,
    summary: summarizeAgg(summaryAgg),
    series: timeSeriesFromBuckets(buckets, range),
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
    suspendedCount: accounts.filter((account) => account.suspendedAt).length,
    servedCount: accounts.filter(
      (account) => account.effectivePlan && !account.suspendedAt,
    ).length,
  }
}
