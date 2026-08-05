import dayjs from 'dayjs'
import { getEdgeCacheStats } from '@/actions/analytics'
import {
  aggregateRollupSummary,
  groupRollupsByBucket,
} from '@/data-access/analytics-aggregates'
import { historicalRollupBucketing } from '@/data-access/analytics-rollups'
import { getOrgPlan } from '@/data-access/subscriptions'
import {
  summarizeAgg,
  timeSeriesFromBuckets,
} from '@/helpers/analytics/rollup-shapers'
import {
  type HistorySearch,
  limitHistorySearch,
} from '@/helpers/history/window'
import { DEFAULT_HISTORY_DAYS } from '@/lib/billing/plans'

// Per-customer usage series for the operator customer-detail Overview tab.
// Scoped to one org (unlike the platform-wide cross-org queries).
export async function getCustomerUsageSeries(
  orgId: string,
  input: HistorySearch,
) {
  const plan = await getOrgPlan(orgId)
  const maxHistoryDays = plan?.historyDays ?? DEFAULT_HISTORY_DAYS
  const range = limitHistorySearch(input, maxHistoryDays)
  const bucketing = historicalRollupBucketing(range)
  const opts = { gte: bucketing.gte, lt: bucketing.lt, orgId }
  const [summaryAgg, buckets, edge] = await Promise.all([
    aggregateRollupSummary(opts),
    groupRollupsByBucket(opts),
    getEdgeCacheStats(orgId, range, true).catch(() => null),
  ])
  return {
    ...range,
    maxHistoryDays,
    window: {
      from: dayjs(bucketing.gte).format('YYYY-MM-DD'),
      to: dayjs(bucketing.lt).subtract(1, 'millisecond').format('YYYY-MM-DD'),
    },
    summary: summarizeAgg(summaryAgg),
    series: timeSeriesFromBuckets(buckets, bucketing),
    edge,
  }
}
