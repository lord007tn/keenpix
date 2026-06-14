import type { z } from 'zod'
import { getEffectiveCloudflareSettings } from '@/data-access/admin/cloudflare'
import { listRollupsForRange } from '@/data-access/analytics'
import {
  rollupsToLatencyBins,
  rollupsToLatencyTrend,
  rollupsToStatusSeries,
  rollupsToTimeSeries,
  summarizeRollups,
} from '@/data-access/analytics-rollups'
import {
  getProject,
  listProjects,
  resolveProjectId,
} from '@/data-access/projects'
import {
  domainBreakdown,
  hostTraffic,
  projectBreakdown,
} from '@/helpers/analytics/breakdowns'
import {
  availableFilters,
  formatDistribution,
  geoDistribution,
  topImages,
} from '@/helpers/analytics/distributions'
import { fetchEdgeCacheStats } from '@/lib/cloudflare/analytics'
import type { analyticsInputSchema } from '@/schemas/analytics'
import type {
  AllowedHostStat,
  AnalyticsRange,
  EdgeCacheStats,
} from '@/shared/types'

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
  // Two reads cover the whole page: the filtered window powers every metric
  // card; one unfiltered read of the same window serves both the filter menus
  // (which must always offer every value present, ignoring the active filters)
  // and the project/domain breakdown. Project names load in parallel and are
  // only used by the org-wide breakdown.
  const [filtered, unfiltered, projects] = await Promise.all([
    listRollupsForRange(input.range, project, filters),
    listRollupsForRange(input.range, project),
    project ? Promise.resolve([]) : listProjects(),
  ])

  // Per-project domain rollup vs. org-wide project rollup: one or the other,
  // matching which scope the page is showing.
  const breakdown = project
    ? []
    : projectBreakdown(unfiltered, new Map(projects.map((p) => [p.id, p.name])))

  return {
    range: input.range,
    summary: summarizeRollups(filtered),
    series: rollupsToTimeSeries(filtered, input.range),
    formats: formatDistribution(filtered),
    topImages: topImages(filtered),
    latency: rollupsToLatencyBins(filtered),
    latencyTrend: rollupsToLatencyTrend(filtered, input.range),
    statusSeries: rollupsToStatusSeries(filtered, input.range),
    geo: geoDistribution(filtered),
    breakdown,
    domainBreakdown: project ? domainBreakdown(unfiltered) : null,
    available: availableFilters(unfiltered),
  }
}

// Cloudflare edge cache (zone-wide, last 24h). Split out of the page payload so
// a transient Cloudflare round-trip never blocks the analytics/overview render —
// the client fetches it separately and fills the edge cards in afterward. Only
// queried when wired up in Settings → CDN cache; a transient error reports
// "couldn't load" (edgeConfigured true, edge null) rather than blanking a card.
export async function getEdgeCacheStats(): Promise<{
  edge: EdgeCacheStats | null
  edgeConfigured: boolean
}> {
  const cloudflare = await getEffectiveCloudflareSettings()
  if (!cloudflare) {
    return { edge: null, edgeConfigured: false }
  }
  try {
    return { edge: await fetchEdgeCacheStats(cloudflare), edgeConfigured: true }
  } catch {
    return { edge: null, edgeConfigured: true }
  }
}

// Per-allowed-host stats for the project Settings → Security table. Joins the
// project's allowlist with observed traffic so allowed-but-idle hosts show
// zeroes and seen-but-unlisted hosts surface for review.
export async function getAllowedHostStats(
  projectId: string,
  range: AnalyticsRange,
): Promise<AllowedHostStat[]> {
  const [project, rows] = await Promise.all([
    getProject(projectId),
    listRollupsForRange(range, projectId),
  ])
  const traffic = hostTraffic(rows)
  const allowed = project?.allowedOrigins ?? []
  const allowedSet = new Set(allowed)
  const rowsOut: AllowedHostStat[] = allowed.map((host) => {
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
      rowsOut.push({ host, allowed: false, ...s })
    }
  }
  return rowsOut
}
