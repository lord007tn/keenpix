import { createServerFn } from '@tanstack/react-start'
import {
  getAllowedHostStats,
  getAnalytics,
  getEdgeCacheStats,
} from '@/actions/analytics'
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

// Cloudflare edge stats are zone-wide and fixed to the last 24h, so they take no
// range/project input. Fetched on its own off the page's critical path so the
// remote Cloudflare call never blocks the analytics/overview render.
export const getEdgeCacheStatsFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(() => getEdgeCacheStats())

export const getAllowedHostStatsFn = createServerFn({ method: 'GET' })
  .inputValidator(allowedHostStatsSchema)
  .middleware([authMiddleware])
  .handler(({ data }) => getAllowedHostStats(data.projectId, data.range))
