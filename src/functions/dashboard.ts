import { createServerFn } from '@tanstack/react-start'
import {
  getDashboardKpis,
  getProjectStats,
  getTimeSeries,
} from '@/data-access/analytics'
import { listProjects } from '@/data-access/projects'
import { authMiddleware } from '@/lib/auth/guards'
import { dashboardInputSchema } from '@/schemas/analytics'

// Dashboard payload is assembled server-side so every surface uses the same
// project scope: KPIs, chart series, project list, and per-project stats.
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
