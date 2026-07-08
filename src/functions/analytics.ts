import { createServerFn } from '@tanstack/react-start'
import {
  getAllowedHostStats,
  getAnalytics,
  getEdgeCacheStats,
} from '@/actions/analytics'
import { authMiddleware, requireActiveOrg } from '@/lib/auth/guards'
import {
  allowedHostStatsSchema,
  analyticsInputSchema,
  edgeCacheStatsSchema,
} from '@/schemas/analytics'

// A selected project already scopes the page, so the per-project breakdown only
// appears in the org-wide "All projects" analytics view.
export const getAnalyticsFn = createServerFn({ method: 'GET' })
  .inputValidator(analyticsInputSchema)
  .middleware([authMiddleware])
  .handler(({ data, context }) => getAnalytics(requireActiveOrg(context), data))

// Cloudflare edge stats for the selected range, reconstructed from our persisted
// rollups. Fetched on its own off the page's critical path so it never blocks the
// analytics/overview render.
export const getEdgeCacheStatsFn = createServerFn({ method: 'GET' })
  .inputValidator(edgeCacheStatsSchema)
  .middleware([authMiddleware])
  .handler(({ data, context }) =>
    getEdgeCacheStats(data.range, context.role === 'super_admin'),
  )

export const getAllowedHostStatsFn = createServerFn({ method: 'GET' })
  .inputValidator(allowedHostStatsSchema)
  .middleware([authMiddleware])
  .handler(({ data, context }) =>
    getAllowedHostStats(requireActiveOrg(context), data.projectId, data.range),
  )
