import dayjs from 'dayjs'
import type { z } from 'zod'
import { listRollupsBetween } from '@/data-access/analytics'
import {
  rollupRangeMeta,
  rollupsToLatencyBins,
  rollupsToTimeSeries,
  summarizeRollups,
} from '@/data-access/analytics-rollups'
import { listLogs } from '@/data-access/logs'
import { listProjects } from '@/data-access/projects'
import { projectStats } from '@/helpers/analytics/breakdowns'
import type { dashboardInputSchema } from '@/schemas/analytics'

// The Overview is a scope-aware bird's-eye: KPI trends, the request chart, and
// recent activity follow the selected project; the project table and operations
// (global-only) are dropped to "all projects". The KPI cards are the same
// source-split cards as the analytics page (so the two pages never disagree).
// Cloudflare edge data is fetched separately by the client so a slow round-trip
// never blocks this render.
export async function getDashboard(
  input: z.output<typeof dashboardInputSchema>,
) {
  const projects = await listProjects()
  // Unknown/stale id means "all projects". Per-project comparison stats power
  // the all-projects table only, so skip them when scoped to one project.
  const project =
    input.project && projects.some((p) => p.id === input.project)
      ? input.project
      : undefined

  // One read of the current window powers KPIs, the chart series, latency, and
  // (all-projects) the per-project table; a second disjoint read of the
  // immediately-previous window gives the KPI trend deltas. A single `now`
  // pins both windows so the chart and KPI windows can't drift apart.
  const { n, ms } = rollupRangeMeta(input.range)
  const windowMs = n * ms
  const now = dayjs()
  const curGte = now.subtract(windowMs, 'millisecond').toDate()
  const prevGte = now.subtract(2 * windowMs, 'millisecond').toDate()
  const [current, previous, recentLogs] = await Promise.all([
    listRollupsBetween(project, curGte),
    listRollupsBetween(project, prevGte, curGte),
    listLogs(5, project),
  ])

  const cur = summarizeRollups(current)
  const prev = summarizeRollups(previous)
  const kpis = {
    requests: { value: cur.totalRequests, prev: prev.totalRequests },
    bandwidthSaved: { value: cur.bandwidthSaved, prev: prev.bandwidthSaved },
    bandwidthIn: cur.bandwidthIn,
    bandwidthOut: cur.bandwidthOut,
    hitRate: { value: cur.hitRate, prev: prev.hitRate },
    p95: { value: cur.p95, prev: prev.p95 },
  }

  return {
    range: input.range,
    projects,
    stats: project ? {} : projectStats(current),
    kpis,
    series: rollupsToTimeSeries(current, input.range),
    recentLogs,
    // Same per-request latency the Analytics page shows, so the shared Response
    // latency card reads identically on both.
    latencySummary: cur,
    latency: rollupsToLatencyBins(current),
  }
}
