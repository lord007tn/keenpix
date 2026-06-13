import type { z } from 'zod'
import {
  getDashboardKpis,
  getProjectStats,
  getTimeSeries,
} from '@/data-access/analytics'
import { listLogs } from '@/data-access/logs'
import { listProjects } from '@/data-access/projects'
import type { dashboardInputSchema } from '@/schemas/analytics'

// The dashboard is a scope-aware bird's-eye: KPI trends, the request chart, and
// recent activity follow the selected project; the project table and operations
// (global-only) are dropped to "all projects". Edge/source-split detail lives on
// the analytics page, not here.
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
  return {
    range: input.range,
    projects,
    stats,
    kpis,
    series,
    recentLogs,
  }
}
