// Namespace imports are intentional: we swap the whole aggregate module at
// runtime, and this is server-only code where bundle tree-shaking is moot.
import { clickhouseEnabled } from '@keenpix/clickhouse/config'
// biome-ignore lint/performance/noNamespaceImport: runtime source strategy, server-only
import * as pgAnalytics from '@/data-access/analytics-aggregates'
// biome-ignore lint/performance/noNamespaceImport: runtime source strategy, server-only
import * as chAnalytics from '@/data-access/clickhouse-analytics'
import { errorContext, logger } from '@/lib/logger/logger'
import { isCloud } from '@/server/deployment'

// Both modules expose the same aggregate functions returning the same Agg
// shapes, so callers are source-agnostic.
export type AnalyticsSource = typeof pgAnalytics | typeof chAnalytics

// Cloud dashboards always read the transactional Postgres rollups, which are the
// authoritative organization/project totals used for billing. ClickHouse remains
// an optional self-host analytics source and raw-log mirror; a missed best-effort
// mirror can therefore never silently undercount a cloud customer's dashboard.
export function pickAnalyticsSource(_orgId: string): AnalyticsSource {
  if (isCloud()) {
    return pgAnalytics
  }
  if (!clickhouseEnabled()) {
    return pgAnalytics
  }
  return chAnalytics
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
