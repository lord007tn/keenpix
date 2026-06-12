import type { z } from 'zod'
import {
  getAnalyticsSummary,
  getAvailableFilters,
  getDomainBreakdown,
  getFormatDistribution,
  getHostTraffic,
  getLatencyBins,
  getProjectBreakdown,
  getTimeSeries,
  getTopImages,
} from '@/data-access/analytics'
import { getProject, resolveProjectId } from '@/data-access/projects'
import type { analyticsInputSchema } from '@/schemas/analytics'
import type { AllowedHostStat, AnalyticsRange } from '@/shared/types'

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

// Per-allowed-host stats for the project Settings → Security table. Joins the
// project's allowlist with observed traffic so allowed-but-idle hosts show
// zeroes and seen-but-unlisted hosts surface for review.
export async function getAllowedHostStats(
  projectId: string,
  range: AnalyticsRange,
): Promise<AllowedHostStat[]> {
  const [project, traffic] = await Promise.all([
    getProject(projectId),
    getHostTraffic(range, projectId),
  ])
  const allowed = project?.allowedOrigins ?? []
  const allowedSet = new Set(allowed)
  const rows: AllowedHostStat[] = allowed.map((host) => {
    const s = traffic.get(host)
    return {
      host,
      allowed: true,
      requests: s?.requests ?? 0,
      hitRate: s?.hitRate ?? 0,
      bandwidthSaved: s?.bandwidthSaved ?? 0,
      lastSeen: s?.lastSeen ?? null,
    }
  })
  for (const [host, s] of traffic) {
    if (!allowedSet.has(host)) {
      rows.push({ host, allowed: false, ...s })
    }
  }
  return rows
}
