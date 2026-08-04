import type { z } from 'zod'
import type { EffectiveCloudflareSettings } from '@/data-access/admin/cloudflare'
import { getEffectiveCloudflareSettings } from '@/data-access/admin/cloudflare'
import { analyticsCoverageStart } from '@/data-access/analytics-aggregates'
import {
  historicalRollupBucketing,
  rollupSinceFor,
} from '@/data-access/analytics-rollups'
import {
  getEdgeCaptureState,
  listEdgeCaptureStates,
  listPlatformEdgeRollups,
  platformEdgeCoverageStart,
} from '@/data-access/edge-rollups'
import {
  getProjectEdgeCaptureState,
  listProjectEdgeRollups,
  projectEdgeCoverageStart,
} from '@/data-access/project-edge-rollups'
import {
  getProject,
  listProjects,
  resolveProjectId,
} from '@/data-access/projects'
import {
  hasContinuousEdgeCoverage,
  reconstructEdgeStats,
} from '@/helpers/analytics/edge-rollups'
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
import type {
  analyticsInputSchema,
  edgeCacheStatsSchema,
} from '@/schemas/analytics'
import { isCloud } from '@/server/deployment'
import type {
  AllowedHostStat,
  AnalyticsRange,
  EdgeCacheStats,
} from '@/shared/types'
import { withAnalyticsSource } from './analytics-source'
import {
  captureConfiguredEdgeHistory,
  captureConfiguredProjectEdgeHistory,
} from './edge-history'

// Every metric is a GROUP BY / aggregate, so the store returns a few pre-summed
// rows instead of the full per-(hour × project × host × country × path × format
// × status) fan-out. Pure shapers in analytics-aggregates turn the summed rows
// into the page's series/distributions/breakdowns.
export async function getAnalytics(
  orgId: string,
  input: z.output<typeof analyticsInputSchema>,
) {
  // Validate the requested project within the caller's org. An unknown, stale,
  // or foreign id is scoped to an impossible project instead of widening to the
  // organization's all-projects view.
  const resolvedProject = await resolveProjectId(input.project, orgId)
  const project = input.project
    ? (resolvedProject ?? '__invalid_project_scope__')
    : undefined
  const filters = {
    country: input.country ?? [],
    // Domain filtering is only meaningful within a single project's allowlist.
    domain: project ? (input.domain ?? []) : [],
    format: input.format ?? [],
    outcome: input.outcome ?? [],
    status: input.status ?? [],
  }
  const coverageStart =
    input.range === 'all'
      ? await analyticsCoverageStart({ orgId, projectId: project })
      : null
  const window = historicalRollupBucketing({
    coverageStart,
    from: input.from,
    range: input.range,
    to: input.to,
  })
  // The filtered window powers every metric card; the unfiltered window feeds
  // the filter menus (which must offer every value present) and the breakdown.
  const filtered = {
    gte: window.gte,
    lt: window.lt,
    orgId,
    projectId: project,
    filters,
  }
  const unfiltered = {
    gte: window.gte,
    lt: window.lt,
    orgId,
    projectId: project,
  }
  return withAnalyticsSource(orgId, async (source) => {
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
      source.aggregateRollupSummary(filtered),
      source.groupRollupsByBucket(filtered),
      source.groupRollupsByBucketStatus(filtered),
      source.groupRollupsByFormat(filtered),
      source.groupRollupsByPath(filtered),
      source.groupRollupsByCountry(filtered),
      source.listAvailableFilters(unfiltered),
      project ? Promise.resolve([]) : listProjects(orgId),
      project
        ? Promise.resolve(null)
        : source.groupRollupsByProject(unfiltered),
      project ? source.groupRollupsByHost(unfiltered) : Promise.resolve(null),
    ])

    return {
      range: input.range,
      summary: summarizeAgg(summaryAgg),
      window: {
        from: window.gte.toISOString(),
        to: window.lt.toISOString(),
      },
      series: timeSeriesFromBuckets(buckets, window),
      formats: formatDistribution(formats),
      topImages,
      latency: latencyBinsFromAgg(summaryAgg),
      latencyTrend: latencyTrendFromBuckets(buckets, window),
      statusSeries: statusSeriesFromBuckets(statusBuckets, window),
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
  })
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
const projectCaptureInFlight = new Map<string, Promise<void>>()

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
  const run = captureConfiguredEdgeHistory(settings)
    .then(() => undefined)
    .finally(() => {
      captureInFlight.delete(key)
    })
  captureInFlight.set(key, run)
  return run
}

function startProjectEdgeCapture(
  settings: EffectiveCloudflareSettings,
): Promise<void> | null {
  if (!settings.accountId) {
    return null
  }
  const key = `project:${settings.accountId}`
  const running = projectCaptureInFlight.get(key)
  if (running) {
    return running
  }
  const last = lastCaptureAt.get(key)
  if (last && Date.now() - last < CAPTURE_THROTTLE_MS) {
    return null
  }
  lastCaptureAt.set(key, Date.now())
  const run = captureConfiguredProjectEdgeHistory(settings)
    .then(() => undefined)
    .finally(() => {
      projectCaptureInFlight.delete(key)
    })
  projectCaptureInFlight.set(key, run)
  return run
}

// Edge cache stats for the selected range, reconstructed from our persisted
// rollups. Split out of the page payload so a transient Cloudflare round-trip
// never blocks the render — the client fetches it separately. `edgeCovered` is
// false when the window reaches before our captured history (so the UI can show
// the edge data without reconciling misleading totals).
export async function getEdgeCacheStats(
  orgId: string | undefined,
  input: z.output<typeof edgeCacheStatsSchema>,
  viewerIsAdmin: boolean,
): Promise<{
  edge: EdgeCacheStats | null
  edgeConfigured: boolean
  edgeCovered: boolean
  edgeError: string | null
  edgeLastSuccessAt: string | null
  edgeRefreshing: boolean
  edgeStatus: 'unconfigured' | 'ready' | 'ok_empty' | 'partial' | 'failed'
}> {
  const cloudflare = await getEffectiveCloudflareSettings()
  if (!cloudflare) {
    return {
      edge: null,
      edgeConfigured: false,
      edgeCovered: false,
      edgeError: null,
      edgeLastSuccessAt: null,
      edgeRefreshing: false,
      edgeStatus: 'unconfigured',
    }
  }

  // Cloud dashboards and platform finance use the same trusted Worker
  // telemetry. It covers canonical project paths and verified custom domains,
  // while keeping every row attributable to a project and organization.
  if (cloudflare.accountId) {
    try {
      const resolvedProject = orgId
        ? await resolveProjectId(input.project, orgId)
        : undefined
      const projectId =
        input.project && orgId
          ? (resolvedProject ?? '__invalid_project_scope__')
          : undefined
      let captureState = await getProjectEdgeCaptureState()
      let refreshing = false
      if (captureState?.lastSuccessAt) {
        const capture = startProjectEdgeCapture(cloudflare)
        if (capture) {
          capture.catch(() => {
            // Best-effort refresh; serve the durable scoped history below.
          })
          refreshing = true
        }
      } else {
        await startProjectEdgeCapture(cloudflare)
        captureState = await getProjectEdgeCaptureState()
      }
      const coverageStart = await projectEdgeCoverageStart({ orgId, projectId })
      const window = historicalRollupBucketing({ ...input, coverageStart })
      const rows = await listProjectEdgeRollups({
        gte: window.gte,
        lt: window.lt,
        orgId,
        projectId,
      })
      const covered = captureState
        ? hasContinuousEdgeCoverage(
            [captureState],
            window.gte,
            window.lt,
            CAPTURE_THROTTLE_MS + 60_000,
          )
        : false
      let edgeStatus: 'ready' | 'ok_empty' | 'partial' | 'failed' = 'partial'
      if (captureState?.status === 'failed') {
        edgeStatus = 'failed'
      } else if (covered) {
        edgeStatus = rows.length === 0 ? 'ok_empty' : 'ready'
      }
      return {
        edge: reconstructEdgeStats(rows, window),
        edgeConfigured: true,
        edgeCovered: covered,
        edgeError: captureState?.lastError ?? null,
        edgeLastSuccessAt: captureState?.lastSuccessAt?.toISOString() ?? null,
        edgeRefreshing: refreshing,
        edgeStatus,
      }
    } catch (error) {
      return {
        edge: null,
        edgeConfigured: true,
        edgeCovered: false,
        edgeError:
          error instanceof Error
            ? error.message
            : 'Cloudflare project analytics failed',
        edgeLastSuccessAt: null,
        edgeRefreshing: false,
        edgeStatus: 'failed',
      }
    }
  }

  if (orgId && isCloud() && !viewerIsAdmin) {
    return {
      edge: null,
      edgeConfigured: false,
      edgeCovered: false,
      edgeError: null,
      edgeLastSuccessAt: null,
      edgeRefreshing: false,
      edgeStatus: 'unconfigured',
    }
  }
  // Self-hosted installations without Analytics Engine retain the zone-wide
  // Cloudflare GraphQL capture as their compatibility source.
  const host = cloudflare.host ?? ''
  try {
    let captureState = await getEdgeCaptureState(cloudflare.zoneId, host)
    let refreshing = false
    if (captureState?.lastSuccessAt) {
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
      captureState = await getEdgeCaptureState(cloudflare.zoneId, host)
    }
    const coverageStart = await platformEdgeCoverageStart()
    const window = historicalRollupBucketing({
      ...input,
      coverageStart,
    })
    const [rows, captureStates] = await Promise.all([
      listPlatformEdgeRollups(window.gte, window.lt),
      listEdgeCaptureStates(),
    ])
    const coverageGraceMs = CAPTURE_THROTTLE_MS + 60_000
    const covered = hasContinuousEdgeCoverage(
      captureStates,
      window.gte,
      window.lt,
      coverageGraceMs,
    )
    let edgeStatus: 'ready' | 'ok_empty' | 'partial' | 'failed' = 'partial'
    if (captureState?.status === 'failed') {
      edgeStatus = 'failed'
    } else if (covered) {
      edgeStatus = rows.length === 0 ? 'ok_empty' : 'ready'
    }
    return {
      edge: reconstructEdgeStats(rows, window),
      edgeConfigured: true,
      edgeCovered: covered,
      edgeError: captureState?.lastError ?? null,
      edgeLastSuccessAt: captureState?.lastSuccessAt?.toISOString() ?? null,
      edgeRefreshing: refreshing,
      edgeStatus,
    }
  } catch (error) {
    return {
      edge: null,
      edgeConfigured: true,
      edgeCovered: false,
      edgeError:
        error instanceof Error ? error.message : 'Cloudflare analytics failed',
      edgeLastSuccessAt: null,
      edgeRefreshing: false,
      edgeStatus: 'failed',
    }
  }
}

// Per-allowed-host stats for the project Settings → Security table. Joins the
// project's allowlist with measured traffic so allowed-but-idle hosts show
// zeroes and seen-but-unlisted hosts surface for review.
export async function getAllowedHostStats(
  orgId: string,
  projectId: string,
  range: AnalyticsRange,
): Promise<AllowedHostStat[]> {
  const [project, hostGrouped] = await Promise.all([
    getProject(projectId, orgId),
    withAnalyticsSource(orgId, (source) =>
      source.groupRollupsByHost({
        gte: rollupSinceFor(range),
        orgId,
        projectId,
      }),
    ),
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
