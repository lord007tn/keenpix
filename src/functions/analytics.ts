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
import type { AnalyticsRange, ProjectBreakdownRow } from '@/shared/types'

const RANGES: AnalyticsRange[] = ['24h', '7d', '30d', '90d']

interface AnalyticsInput {
  format?: string[]
  project?: string
  range: AnalyticsRange
  status?: string[]
}

export const getAnalyticsFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator(
    (input: AnalyticsInput): AnalyticsInput => ({
      range: RANGES.includes(input?.range) ? input.range : '24h',
      project:
        typeof input?.project === 'string' && input.project
          ? input.project
          : undefined,
      format: Array.isArray(input?.format)
        ? input.format.filter((f) => typeof f === 'string')
        : undefined,
      status: Array.isArray(input?.status)
        ? input.status.filter((s) => typeof s === 'string')
        : undefined,
    }),
  )
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
