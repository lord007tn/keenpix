import type { z } from 'zod'
import { getEffectiveCloudflareSettings } from '@/data-access/admin/cloudflare'
import {
  getDashboardKpis,
  getProjectStats,
  getTimeSeries,
} from '@/data-access/analytics'
import { listProjects } from '@/data-access/projects'
import { fetchEdgeCacheStats } from '@/lib/cloudflare/analytics'
import type { dashboardInputSchema } from '@/schemas/analytics'
import type { EdgeCacheStats } from '@/shared/types'

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
  const [kpis, series] = await Promise.all([
    getDashboardKpis(input.range, project),
    getTimeSeries(input.range, project),
  ])
  const stats = project ? {} : await getProjectStats(input.range)
  // Cloudflare edge layer (zone-wide, last 24h). Kept separate from the
  // range-based keenpix KPIs; a transient Cloudflare error must not blank the
  // dashboard.
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
    edge,
    edgeConfigured: Boolean(cloudflare),
  }
}
