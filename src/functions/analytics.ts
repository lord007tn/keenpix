import { createServerFn } from '@tanstack/react-start'
import {
  getAnalyticsSummary,
  getFormatDistribution,
  getLatencyBins,
  getProjectBreakdown,
  getTimeSeries,
  getTopImages,
} from '@/data-access/analytics'
import { authMiddleware } from '@/lib/auth/guards'
import { analyticsInputSchema } from '@/schemas/analytics'
import type { ProjectBreakdownRow } from '@/shared/types'

// A selected project already scopes the page, so the per-project breakdown only
// appears in the org-wide "All projects" analytics view.
export const getAnalyticsFn = createServerFn({ method: 'GET' })
  .inputValidator(analyticsInputSchema)
  .middleware([authMiddleware])
  .handler(async ({ data: { range, project, format, status } }) => {
    const filters = { format, status }
    const [summary, series, formats, topImages, latency, breakdown] =
      await Promise.all([
        getAnalyticsSummary(range, project, filters),
        getTimeSeries(range, project, filters),
        getFormatDistribution(range, project, filters),
        getTopImages(range, project, filters),
        getLatencyBins(range, project, filters),
        project
          ? Promise.resolve<ProjectBreakdownRow[]>([])
          : getProjectBreakdown(range),
      ])
    return { range, summary, series, formats, topImages, latency, breakdown }
  })
