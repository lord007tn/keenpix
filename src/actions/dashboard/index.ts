import type { z } from 'zod'
import { getEffectiveCloudflareSettings } from '@/data-access/admin/cloudflare'
import {
  getAnalyticsSummary,
  getDashboardKpis,
  getLatencyBins,
  getProjectStats,
  getTimeSeries,
} from '@/data-access/analytics'
import { listLogs } from '@/data-access/logs'
import { listProjects } from '@/data-access/projects'
import { fetchEdgeCacheStats } from '@/lib/cloudflare/analytics'
import type { dashboardInputSchema } from '@/schemas/analytics'
import type { EdgeCacheStats } from '@/shared/types'

// The Overview is a scope-aware bird's-eye: KPI trends, the request chart, and
// recent activity follow the selected project; the project table and operations
// (global-only) are dropped to "all projects". The KPI cards are the same
// source-split cards as the analytics page (so the two pages never disagree) —
// edge data is included here whenever Cloudflare is configured.
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
  const [kpis, series, recentLogs, latencySummary, latency] = await Promise.all(
    [
      getDashboardKpis(input.range, project),
      getTimeSeries(input.range, project),
      listLogs(5, project),
      // Same per-request latency the Analytics page shows, so the shared Response
      // latency card reads identically on both.
      getAnalyticsSummary(input.range, project),
      getLatencyBins(input.range, project),
    ],
  )
  const stats = project ? {} : await getProjectStats(input.range)

  // Cloudflare edge cache (zone-wide, last 24h). Same source as the analytics
  // page; a transient error must never blank the overview.
  const cloudflare = await getEffectiveCloudflareSettings()
  let edge: EdgeCacheStats | null = null
  if (cloudflare) {
    try {
      edge = await fetchEdgeCacheStats(cloudflare)
    } catch {
      edge = null
    }
  }

  return {
    range: input.range,
    projects,
    stats,
    kpis,
    series,
    recentLogs,
    latencySummary,
    latency,
    edge,
    edgeConfigured: Boolean(cloudflare),
  }
}
