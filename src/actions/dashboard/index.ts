import type { z } from 'zod'
import { getEffectiveCloudflareSettings } from '@/data-access/admin/cloudflare'
import {
  getAnalyticsSummary,
  getDashboardKpis,
  getProjectStats,
  getTimeSeries,
} from '@/data-access/analytics'
import { listLogs } from '@/data-access/logs'
import { listProjects } from '@/data-access/projects'
import { fetchEdgeCacheStats } from '@/lib/cloudflare/analytics'
import type { dashboardInputSchema } from '@/schemas/analytics'
import type { EdgeSnapshot } from '@/shared/types'

// The Overview is a scope-aware bird's-eye: KPI trends, the request chart, and
// recent activity follow the selected project; the edge snapshot, project table,
// and operations (all global-only) are dropped to "all projects". The full
// edge/origin breakdown and deep charts live on the analytics page.
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
  const [kpis, series, recentLogs] = await Promise.all([
    getDashboardKpis(input.range, project),
    getTimeSeries(input.range, project),
    listLogs(5, project),
  ])
  const stats = project ? {} : await getProjectStats(input.range)

  // Cloudflare edge is zone-wide and fixed to 24h, so the delivery snapshot only
  // applies to the all-projects overview. End-to-end efficiency combines the
  // edge hits with keenpix disk hits over the same 24h whole-zone window.
  const cloudflare = await getEffectiveCloudflareSettings()
  let edgeSnapshot: EdgeSnapshot | null = null
  if (cloudflare && !project) {
    try {
      const edge = await fetchEdgeCacheStats(cloudflare)
      const origin24h = await getAnalyticsSummary('24h', undefined, {})
      const diskHits = Math.round(
        (origin24h.totalRequests * origin24h.hitRate) / 100,
      )
      edgeSnapshot = {
        windowHours: edge.windowHours,
        requests: edge.requests,
        servedAtEdge: edge.cachedRequests,
        reachedKeenpix: edge.requests - edge.cachedRequests,
        bytesOffloaded: edge.bytesFromEdge,
        hitRate: edge.hitRate,
        endToEnd:
          edge.requests === 0
            ? 0
            : ((edge.cachedRequests + diskHits) / edge.requests) * 100,
      }
    } catch {
      edgeSnapshot = null
    }
  }

  return {
    range: input.range,
    projects,
    stats,
    kpis,
    series,
    recentLogs,
    edgeSnapshot,
    edgeConfigured: Boolean(cloudflare),
  }
}
