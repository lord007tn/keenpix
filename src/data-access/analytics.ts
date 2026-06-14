import { prisma } from '@/db'
import type { AnalyticsRange } from '@/shared/types'
import { listAnalyticsRollups, rollupSinceFor } from './analytics-rollups'

// Real analytics read from hourly Postgres rollups. Raw request_logs still power
// Live Logs and short-term debugging, but dashboard-style aggregation should not
// scan the raw table indefinitely.
//
// These two functions are the only DB reads the analytics/dashboard actions
// need: each loads the rollup rows for a window once, and the action derives
// every metric (summary, series, formats, top images, latency, breakdowns, …)
// from that single in-memory set instead of re-querying per chart.

export interface AnalyticsFilters {
  domain?: string[]
  format?: string[]
  status?: string[]
}

// Rollup rows for a named range ending now, optionally scoped to a project and
// narrowed by the active format/status/domain filters.
export function listRollupsForRange(
  range: AnalyticsRange,
  projectId?: string,
  filters?: AnalyticsFilters,
) {
  return listAnalyticsRollups(prisma, {
    gte: rollupSinceFor(range),
    projectId,
    filters,
  })
}

// Rollup rows for an explicit [gte, lt) window, used by the dashboard to read
// the current and previous windows for trend deltas.
export function listRollupsBetween(
  projectId: string | undefined,
  gte: Date,
  lt?: Date,
) {
  return listAnalyticsRollups(prisma, { gte, lt, projectId })
}
