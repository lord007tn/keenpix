import type { z } from 'zod'
import { getEffectiveCloudflareSettings } from '@/data-access/admin/cloudflare'
import {
  aggregateRollupSummary,
  groupRollupsByBucket,
  groupRollupsByBucketStatus,
  groupRollupsByCountry,
  groupRollupsByFormat,
  groupRollupsByHost,
  groupRollupsByPath,
  groupRollupsByProject,
  listAvailableFilters,
} from '@/data-access/analytics-aggregates'
import { rollupSinceFor } from '@/data-access/analytics-rollups'
import {
  getProject,
  listProjects,
  resolveProjectId,
} from '@/data-access/projects'
import {
  domainBreakdown,
  formatDistribution,
  geoDistribution,
  hostTraffic,
  latencyBinsFromAgg,
  latencyTrendFromBuckets,
  projectBreakdown,
  statusSeriesFromBuckets,
  summarizeAgg,
  timeSeriesFromBuckets,
} from '@/helpers/analytics/rollup-shapers'
import { fetchEdgeCacheStats } from '@/lib/cloudflare/analytics'
import type { analyticsInputSchema } from '@/schemas/analytics'
import type {
  AllowedHostStat,
  AnalyticsRange,
  EdgeCacheStats,
} from '@/shared/types'

// Every metric is a Postgres GROUP BY / aggregate, so the database returns a few
// pre-summed rows instead of the full per-(hour × project × host × country ×
// path × format × status) fan-out. Pure shapers in analytics-aggregates turn the
// summed rows into the page's series/distributions/breakdowns.
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
  const gte = rollupSinceFor(input.range)
  // The filtered window powers every metric card; the unfiltered window feeds
  // the filter menus (which must offer every value present) and the breakdown.
  const filtered = { gte, projectId: project, filters }
  const unfiltered = { gte, projectId: project }
  const [
    summaryAgg,
    buckets,
    statusBuckets,
    formats,
    topImages,
    geoRows,
    available,
    projects,
    projectGrouped,
    hostGrouped,
  ] = await Promise.all([
    aggregateRollupSummary(filtered),
    groupRollupsByBucket(filtered),
    groupRollupsByBucketStatus(filtered),
    groupRollupsByFormat(filtered),
    groupRollupsByPath(filtered),
    groupRollupsByCountry(filtered),
    listAvailableFilters(unfiltered),
    project ? Promise.resolve([]) : listProjects(),
    project ? Promise.resolve(null) : groupRollupsByProject(unfiltered),
    project ? groupRollupsByHost(unfiltered) : Promise.resolve(null),
  ])

  return {
    range: input.range,
    summary: summarizeAgg(summaryAgg),
    series: timeSeriesFromBuckets(buckets, input.range),
    formats: formatDistribution(formats),
    topImages,
    latency: latencyBinsFromAgg(summaryAgg),
    latencyTrend: latencyTrendFromBuckets(buckets, input.range),
    statusSeries: statusSeriesFromBuckets(statusBuckets, input.range),
    geo: geoDistribution(geoRows),
    // Per-project domain rollup vs. org-wide project rollup: one or the other,
    // matching which scope the page is showing.
    breakdown: projectGrouped
      ? projectBreakdown(
          projectGrouped,
          new Map(projects.map((p) => [p.id, p.name])),
        )
      : [],
    domainBreakdown: hostGrouped ? domainBreakdown(hostGrouped) : null,
    available,
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
  const [project, hostGrouped] = await Promise.all([
    getProject(projectId),
    groupRollupsByHost({ gte: rollupSinceFor(range), projectId }),
  ])
  const traffic = hostTraffic(hostGrouped)
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
