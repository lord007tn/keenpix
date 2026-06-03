import type { z } from 'zod'
import {
  getAnalyticsSummary,
  getAvailableFilters,
  getFormatDistribution,
  getLatencyBins,
  getProjectBreakdown,
  getTimeSeries,
  getTopImages,
} from '@/data-access/analytics'
import type { analyticsInputSchema } from '@/schemas/analytics'

export async function getAnalytics(
  input: z.output<typeof analyticsInputSchema>,
) {
  const filters = {
    format: input.format ?? [],
    status: input.status ?? [],
  }
  const [summary, series, formats, topImages, latency, available] =
    await Promise.all([
      getAnalyticsSummary(input.range, input.project, filters),
      getTimeSeries(input.range, input.project, filters),
      getFormatDistribution(input.range, input.project, filters),
      getTopImages(input.range, input.project, filters),
      getLatencyBins(input.range, input.project, filters),
      getAvailableFilters(input.range, input.project),
    ])
  const breakdown = input.project ? [] : await getProjectBreakdown(input.range)
  return {
    range: input.range,
    summary,
    series,
    formats,
    topImages,
    latency,
    breakdown,
    available,
  }
}
