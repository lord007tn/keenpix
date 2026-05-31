import { createServerFn } from '@tanstack/react-start'
import {
  getDashboardKpis,
  getProjectStats,
  getTimeSeries,
} from '@/data-access/analytics'
import { listProjects } from '@/data-access/projects'
import { authMiddleware } from '@/lib/auth/guards'
import type { AnalyticsRange } from '@/shared/types'

const RANGES: AnalyticsRange[] = ['24h', '7d', '30d', '90d']

interface DashboardInput {
  project?: string
  range: AnalyticsRange
}

/**
 * Dashboard payload: scope-aware KPIs (with real trends) + a requests
 * timeseries for the chart, plus the projects list and per-project 24h stats
 * for the data table.
 */
export const getDashboardFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator(
    (input: DashboardInput): DashboardInput => ({
      range: RANGES.includes(input?.range) ? input.range : '30d',
      project:
        typeof input?.project === 'string' && input.project
          ? input.project
          : undefined,
    }),
  )
  .handler(async ({ data: { range, project } }) => {
    const [projects, stats, kpis, series] = await Promise.all([
      listProjects(),
      getProjectStats(),
      getDashboardKpis(range, project),
      getTimeSeries(range, project),
    ])
    return { range, projects, stats, kpis, series }
  })
