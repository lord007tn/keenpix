import { createServerFn } from '@tanstack/react-start'
import { getDashboard } from '@/actions/dashboard'
import { authMiddleware, requireActiveOrg } from '@/lib/auth/guards'
import { assertHasWorkspaceAccess } from '@/lib/billing/quota'
import { dashboardInputSchema } from '@/schemas/analytics'

// Dashboard payload is assembled server-side so every surface uses the same
// project scope: KPIs, chart series, project list, and per-project stats.
export const getDashboardFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator(dashboardInputSchema)
  .handler(async ({ data, context }) => {
    const orgId = requireActiveOrg(context)
    await assertHasWorkspaceAccess(orgId)
    return getDashboard(orgId, data)
  })
