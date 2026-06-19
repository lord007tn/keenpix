import type { z } from 'zod'
import type { EffectiveCloudflareSettings } from '@/data-access/admin/cloudflare'
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
  edgeCoverageStart,
  listEdgeRollups,
  upsertEdgeRollups,
} from '@/data-access/edge-rollups'
import {
  getProject,
  listProjects,
  resolveProjectId,
} from '@/data-access/projects'
import { reconstructEdgeStats } from '@/helpers/analytics/edge-rollups'
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
import { fetchEdgeAdaptiveHourly } from '@/lib/cloudflare/analytics'
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

// Cloudflare's adaptive dataset is capped at ~24h, so we capture its hourly
// /img/* groups and persist them (EdgeRollupHourly) to build history we can read
// over any range. Capture is opportunistic + throttled per zone+host so a busy
// dashboard keeps it fresh without hammering the API.
const CAPTURE_THROTTLE_MS = 15 * 60 * 1000
const lastCaptureAt = new Map<string, number>()
// In-flight captures per zone+host. The read path doesn't await a background
// refresh, so this lets it report "still preparing" until the fetch lands — the
// client polls on that flag instead of needing a manual reload to see fresh data.
const captureInFlight = new Map<string, Promise<void>>()

// Start a rollup capture unless one is already running or the throttle window
// hasn't elapsed. Returns the in-flight promise (await it to capture
// synchronously) or null when nothing needed to run.
function startEdgeCapture(
  settings: EffectiveCloudflareSettings,
): Promise<void> | null {
  const host = settings.host ?? ''
  const key = `${settings.zoneId}:${host}`
  const running = captureInFlight.get(key)
  if (running) {
    return running
  }
  const last = lastCaptureAt.get(key)
  if (last && Date.now() - last < CAPTURE_THROTTLE_MS) {
    return null
  }
  lastCaptureAt.set(key, Date.now())
  const run = (async () => {
    const groups = await fetchEdgeAdaptiveHourly(settings)
    await upsertEdgeRollups(settings.zoneId, host, groups)
  })().finally(() => {
    captureInFlight.delete(key)
  })
  captureInFlight.set(key, run)
  return run
}

// Edge cache stats for the selected range, reconstructed from our persisted
// rollups. Split out of the page payload so a transient Cloudflare round-trip
// never blocks the render — the client fetches it separately. `edgeCovered` is
// false when the window reaches before our captured history (so the UI can show
// the edge data without reconciling misleading totals).
export async function getEdgeCacheStats(range: AnalyticsRange): Promise<{
  edge: EdgeCacheStats | null
  edgeConfigured: boolean
  edgeCovered: boolean
  edgeRefreshing: boolean
}> {
  const cloudflare = await getEffectiveCloudflareSettings()
  if (!cloudflare) {
    return {
      edge: null,
      edgeConfigured: false,
      edgeCovered: false,
      edgeRefreshing: false,
    }
  }
  const host = cloudflare.host ?? ''
  try {
    const existing = await edgeCoverageStart(cloudflare.zoneId, host)
    let refreshing = false
    if (existing) {
      // Refresh in the background (throttled); don't block the read. Surface
      // whether a capture is actually in flight so the client polls until it
      // lands instead of waiting for a manual reload.
      const capture = startEdgeCapture(cloudflare)
      if (capture) {
        capture.catch(() => {
          // Best-effort — the read still serves what we already have.
        })
        refreshing = true
      }
    } else {
      // No history yet — capture once synchronously so there's data to show.
      await startEdgeCapture(cloudflare)
    }
    const gte = rollupSinceFor(range)
    const [rows, coverageStart] = await Promise.all([
      listEdgeRollups(cloudflare.zoneId, host, gte),
      existing
        ? Promise.resolve(existing)
        : edgeCoverageStart(cloudflare.zoneId, host),
    ])
    return {
      edge: rows.length > 0 ? reconstructEdgeStats(rows, range) : null,
      edgeConfigured: true,
      edgeCovered:
        coverageStart !== null && coverageStart.getTime() <= gte.getTime(),
      edgeRefreshing: refreshing,
    }
  } catch {
    return {
      edge: null,
      edgeConfigured: true,
      edgeCovered: false,
      edgeRefreshing: false,
    }
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
