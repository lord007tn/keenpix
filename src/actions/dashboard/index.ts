import type { z } from 'zod'
import {
  getDashboardKpis,
  getProjectStats,
  getTimeSeries,
} from '@/data-access/analytics'
import { listProjects } from '@/data-access/projects'
import type { dashboardInputSchema } from '@/schemas/analytics'

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
  return { range: input.range, projects, stats, kpis, series }
}
