import {
  aggregateRollupSummary,
  groupRollupsByBucket,
} from '@/data-access/analytics-aggregates'
import { rollupSinceFor } from '@/data-access/analytics-rollups'
import {
  summarizeAgg,
  timeSeriesFromBuckets,
} from '@/helpers/analytics/rollup-shapers'
import type { AnalyticsRange } from '@/shared/types'

// Per-customer usage series for the operator customer-detail Overview tab.
// Scoped to one org (unlike the platform-wide cross-org queries).
export async function getCustomerUsageSeries(
  orgId: string,
  range: AnalyticsRange,
) {
  const opts = { gte: rollupSinceFor(range), orgId }
  const [summaryAgg, buckets] = await Promise.all([
    aggregateRollupSummary(opts),
    groupRollupsByBucket(opts),
  ])
  return {
    range,
    summary: summarizeAgg(summaryAgg),
    series: timeSeriesFromBuckets(buckets, range),
  }
}
