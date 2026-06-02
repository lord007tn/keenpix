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
  const [projects, stats, kpis, series] = await Promise.all([
    listProjects(),
    getProjectStats(),
    getDashboardKpis(input.range, input.project),
    getTimeSeries(input.range, input.project),
  ])
  return { range: input.range, projects, stats, kpis, series }
}
