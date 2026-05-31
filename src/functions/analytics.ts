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
        // The per-project breakdown only applies to the org-wide ("All") view.
        project
          ? Promise.resolve<ProjectBreakdownRow[]>([])
          : getProjectBreakdown(range),
      ])
    return { range, summary, series, formats, topImages, latency, breakdown }
  })
