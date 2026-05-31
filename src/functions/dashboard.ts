import { createServerFn } from '@tanstack/react-start'
import {
  getDashboardKpis,
  getProjectStats,
  getTimeSeries,
} from '@/data-access/analytics'
import { listProjects } from '@/data-access/projects'
import { authMiddleware } from '@/lib/auth/guards'
import { dashboardInputSchema } from '@/schemas/analytics'

/**
 * Dashboard payload: scope-aware KPIs (with real trends) + a requests
 * timeseries for the chart, plus the projects list and per-project 24h stats
 * for the data table.
 */
export const getDashboardFn = createServerFn({ method: 'GET' })
  .inputValidator(dashboardInputSchema)
  .middleware([authMiddleware])
  .handler(async ({ data: { range, project } }) => {
    const [projects, stats, kpis, series] = await Promise.all([
      listProjects(),
      getProjectStats(),
      getDashboardKpis(range, project),
      getTimeSeries(range, project),
    ])
    return { range, projects, stats, kpis, series }
  })
