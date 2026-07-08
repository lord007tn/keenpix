import dayjs from 'dayjs'
import type { z } from 'zod'
import { rollupRangeMeta } from '@/data-access/analytics-rollups'
import { listProjects } from '@/data-access/projects'
import {
  latencyBinsFromAgg,
  projectStats,
  summarizeAgg,
  timeSeriesFromBuckets,
} from '@/helpers/analytics/rollup-shapers'
import type { dashboardInputSchema } from '@/schemas/analytics'
import { withAnalyticsSource } from '../analytics/analytics-source'
import { readLogs } from '../logs'

// The Overview is a scope-aware bird's-eye: KPI trends, the request chart, and
// recent activity follow the selected project; the project table and operations
// (global-only) are dropped to "all projects". The KPI cards are the same
// source-split cards as the analytics page (so the two pages never disagree).
// Cloudflare edge data is fetched separately by the client so a slow round-trip
// never blocks this render.
export async function getDashboard(
  orgId: string,
  input: z.output<typeof dashboardInputSchema>,
) {
  const projects = await listProjects(orgId)
  // Unknown/stale id means "all projects". Per-project comparison stats power
  // the all-projects table only, so skip them when scoped to one project.
  const project =
    input.project && projects.some((p) => p.id === input.project)
      ? input.project
      : undefined

  // One aggregate of the current window powers KPIs, the chart series, latency,
  // and (all-projects) the per-project table; a second aggregate of the disjoint
  // previous window gives the KPI trend deltas. A single `now` pins both windows.
  const { n, ms } = rollupRangeMeta(input.range)
  const windowMs = n * ms
  const now = dayjs()
  const curGte = now.subtract(windowMs, 'millisecond').toDate()
  const prevGte = now.subtract(2 * windowMs, 'millisecond').toDate()
  const cur = { gte: curGte, orgId, projectId: project }
  const prev = { gte: prevGte, lt: curGte, orgId, projectId: project }

  // recentLogs reads the log store (ClickHouse, Postgres fallback) via readLogs,
  // and runs alongside — not inside — the analytics block so a ClickHouse
  // fallback there never double-runs it.
  const [[curSummary, curBuckets, prevSummary, projectGrouped], recentLogs] =
    await Promise.all([
      withAnalyticsSource(orgId, (source) =>
        Promise.all([
          source.aggregateRollupSummary(cur),
          source.groupRollupsByBucket(cur),
          source.aggregateRollupSummary(prev),
          project ? Promise.resolve(null) : source.groupRollupsByProject(cur),
        ]),
      ),
      readLogs(orgId, project, 5),
    ])

  const curStats = summarizeAgg(curSummary)
  const prevStats = summarizeAgg(prevSummary)
  const kpis = {
    requests: { value: curStats.totalRequests, prev: prevStats.totalRequests },
    bandwidthSaved: {
      value: curStats.bandwidthSaved,
      prev: prevStats.bandwidthSaved,
    },
    bandwidthIn: curStats.bandwidthIn,
    bandwidthOut: curStats.bandwidthOut,
    hitRate: { value: curStats.hitRate, prev: prevStats.hitRate },
    p95: { value: curStats.p95, prev: prevStats.p95 },
  }

  return {
    range: input.range,
    projects,
    stats: projectGrouped ? projectStats(projectGrouped) : {},
    kpis,
    series: timeSeriesFromBuckets(curBuckets, input.range),
    recentLogs,
    // Same per-request latency the Analytics page shows, so the shared Response
    // latency card reads identically on both.
    latencySummary: curStats,
    latency: latencyBinsFromAgg(curSummary),
  }
}
