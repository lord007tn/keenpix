// Namespace imports are intentional: we swap the whole aggregate module at
// runtime, and this is server-only code where bundle tree-shaking is moot.
// biome-ignore lint/performance/noNamespaceImport: runtime source strategy, server-only
import * as pgAnalytics from '@/data-access/analytics-aggregates'
// biome-ignore lint/performance/noNamespaceImport: runtime source strategy, server-only
import * as chAnalytics from '@/data-access/clickhouse-analytics'
import { getOrgPlan } from '@/data-access/subscriptions'
import { clickhouseEnabled } from '@/lib/clickhouse/config'
import { errorContext, logger } from '@/lib/logger/logger'
import { isCloud } from '@/server/deployment'

// Both modules expose the same aggregate functions returning the same Agg
// shapes, so callers are source-agnostic.
export type AnalyticsSource = typeof pgAnalytics | typeof chAnalytics

// Choose where analytics aggregates are read from. ClickHouse (raw request_events,
// full fidelity) backs the advanced tier when it's configured; everyone else uses
// the Postgres hourly rollups. Self-host is always "advanced", so it uses
// ClickHouse whenever it's configured. Dashboard and Analytics both call this so
// the two pages never disagree.
export async function pickAnalyticsSource(
  orgId: string,
): Promise<AnalyticsSource> {
  if (!clickhouseEnabled()) {
    return pgAnalytics
  }
  if (!isCloud()) {
    return chAnalytics
  }
  const plan = await getOrgPlan(orgId)
  return plan?.advancedAnalytics ? chAnalytics : pgAnalytics
}

// Run an analytics computation against the org's chosen source, falling back to
// Postgres if the ClickHouse path throws — so a ClickHouse outage degrades
// analytics/dashboard to the rollups instead of 500ing the page (the same safety
// net the logs read has). When the source is already Postgres, there's nothing
// to fall back to, so errors propagate normally.
export async function withAnalyticsSource<T>(
  orgId: string,
  run: (source: AnalyticsSource) => Promise<T>,
): Promise<T> {
  const source = await pickAnalyticsSource(orgId)
  if (source === pgAnalytics) {
    return run(source)
  }
  try {
    return await run(source)
  } catch (error) {
    logger.warn(
      errorContext(error),
      'clickhouse analytics failed; falling back to postgres',
    )
    return run(pgAnalytics)
  }
}
