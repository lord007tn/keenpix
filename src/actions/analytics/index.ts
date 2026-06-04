import type { z } from 'zod'
import {
  getAnalyticsSummary,
  getAvailableFilters,
  getDomainBreakdown,
  getFormatDistribution,
  getLatencyBins,
  getProjectBreakdown,
  getTimeSeries,
  getTopImages,
} from '@/data-access/analytics'
import { resolveProjectId } from '@/data-access/projects'
import type { analyticsInputSchema } from '@/schemas/analytics'

export async function getAnalytics(
  input: z.output<typeof analyticsInputSchema>,
) {
  // Validate the requested project so an unknown/stale id collapses to "all
  // projects" for the data exactly as the UI's project switcher does.
  const project = await resolveProjectId(input.project)
  const filters = {
    // Domain filtering is only meaningful within a single project's allowlist.
    domain: project ? (input.domain ?? []) : [],
    format: input.format ?? [],
    status: input.status ?? [],
  }
  const [summary, series, formats, topImages, latency, available] =
    await Promise.all([
      getAnalyticsSummary(input.range, project, filters),
      getTimeSeries(input.range, project, filters),
      getFormatDistribution(input.range, project, filters),
      getTopImages(input.range, project, filters),
      getLatencyBins(input.range, project, filters),
      getAvailableFilters(input.range, project),
    ])
  // Per-project domain rollup vs. org-wide project rollup: one or the other,
  // matching which scope the page is showing.
  const breakdown = project ? [] : await getProjectBreakdown(input.range)
  const domainBreakdown = project
    ? await getDomainBreakdown(input.range, project)
    : null
  return {
    range: input.range,
    summary,
    series,
    formats,
    topImages,
    latency,
    breakdown,
    domainBreakdown,
    available,
  }
}
