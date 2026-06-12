import { createServerFn } from '@tanstack/react-start'
import { getAllowedHostStats, getAnalytics } from '@/actions/analytics'
import { authMiddleware } from '@/lib/auth/guards'
import {
  allowedHostStatsSchema,
  analyticsInputSchema,
} from '@/schemas/analytics'

// A selected project already scopes the page, so the per-project breakdown only
// appears in the org-wide "All projects" analytics view.
export const getAnalyticsFn = createServerFn({ method: 'GET' })
  .inputValidator(analyticsInputSchema)
  .middleware([authMiddleware])
  .handler(({ data }) => getAnalytics(data))

export const getAllowedHostStatsFn = createServerFn({ method: 'GET' })
  .inputValidator(allowedHostStatsSchema)
  .middleware([authMiddleware])
  .handler(({ data }) => getAllowedHostStats(data.projectId, data.range))
