import { createServerFn } from '@tanstack/react-start'
import { getDashboard } from '@/actions/dashboard'
import { authMiddleware } from '@/lib/auth/guards'
import { dashboardInputSchema } from '@/schemas/analytics'

// Dashboard payload is assembled server-side so every surface uses the same
// project scope: KPIs, chart series, project list, and per-project stats.
export const getDashboardFn = createServerFn({ method: 'GET' })
  .inputValidator(dashboardInputSchema)
  .middleware([authMiddleware])
  .handler(({ data }) => getDashboard(data))
