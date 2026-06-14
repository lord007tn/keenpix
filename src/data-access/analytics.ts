import dayjs, { type Dayjs } from 'dayjs'
import { prisma } from '@/db'
import type {
  AnalyticsRange,
  DomainBreakdownRow,
  ProjectStat,
  TopImageRow,
} from '@/shared/types'
import {
  listAnalyticsRollups,
  type RollupRow,
  rollupRangeMeta,
  rollupSinceFor,
  rollupsToLatencyBins,
  rollupsToStatusSeries,
  rollupsToTimeSeries,
  summarizeRollups,
} from './analytics-rollups'
import { listProjects } from './projects'

// Real analytics read from hourly Postgres rollups. Raw request_logs still power
// Live Logs and short-term debugging, but dashboard-style aggregation should not
// scan the raw table indefinitely.

export interface AnalyticsFilters {
  domain?: string[]
  format?: string[]
  status?: string[]
}

function groupRollups<T>(
  rows: RollupRow[],
  key: (row: RollupRow) => string,
  build: (key: string, rows: RollupRow[]) => T,
) {
  const groups = new Map<string, RollupRow[]>()
  for (const row of rows) {
    const k = key(row)
    const group = groups.get(k)
    if (group) {
      group.push(row)
    } else {
      groups.set(k, [row])
    }
  }
  return [...groups.entries()].map(([k, grouped]) => build(k, grouped))
}

function rowsFor(
  range: AnalyticsRange,
  projectId?: string,
  filters?: AnalyticsFilters,
) {
  return listAnalyticsRollups(prisma, {
    gte: rollupSinceFor(range),
    projectId,
    filters,
  })
}

export async function getAnalyticsSummary(
  range: AnalyticsRange,
  projectId?: string,
  filters?: AnalyticsFilters,
) {
  return summarizeRollups(await rowsFor(range, projectId, filters))
}

export async function getTimeSeries(
  range: AnalyticsRange,
  projectId?: string,
  filters?: AnalyticsFilters,
) {
  return rollupsToTimeSeries(await rowsFor(range, projectId, filters), range)
}

const FORMAT_COLORS: Record<string, string> = {
  avif: 'var(--chart-1)',
  webp: 'var(--chart-2)',
  jpeg: 'var(--chart-4)',
  png: 'var(--chart-3)',
  gif: 'var(--muted-foreground)',
  heif: 'var(--chart-5)',
  svg: 'var(--accent-foreground)',
  tiff: 'var(--secondary-foreground)',
}

export async function getFormatDistribution(
  range: AnalyticsRange = '24h',
  projectId?: string,
  filters?: AnalyticsFilters,
) {
  const rows = await rowsFor(range, projectId, filters)
  const grouped = groupRollups(
    rows,
    (row) => row.format,
    (format, groupedRows) => ({
      format,
      requests: groupedRows.reduce((sum, row) => sum + row.requests, 0),
      saved: groupedRows.reduce((sum, row) => sum + Number(row.bytesSaved), 0),
    }),
  )
  const total = grouped.reduce((sum, row) => sum + row.requests, 0) || 1
  return grouped
    .map((g) => ({
      label: g.format.toUpperCase(),
      value: Math.round((g.requests / total) * 1000) / 10,
      saved: g.saved,
      color: FORMAT_COLORS[g.format] ?? 'var(--muted-foreground)',
    }))
    .sort((a, b) => b.value - a.value)
}

// Distinct formats and statuses that actually have data in the window. The
// format/status filters are deliberately ignored so the filter menus always
// offer every value present (the way Live Logs derives its options from data),
// rather than a fixed list that can include empty values or feel unhelpful.
export async function getAvailableFilters(
  range: AnalyticsRange = '24h',
  projectId?: string,
) {
  const rows = await rowsFor(range, projectId)
  return {
    formats: [...new Set(rows.map((r) => r.format))].sort(),
    statuses: [...new Set(rows.map((r) => r.status))].sort((a, b) => a - b),
    // Source domains actually observed in the window (incl. subdomains), so the
    // filter options match how origins are stored rather than the bare allowlist.
    domains: [...new Set(rows.map((r) => r.sourceHost))].filter(Boolean).sort(),
  }
}

// Most-requested paths carrying both request count and delivered bytes, so the
// card can rank by either. Capped wider than the 8 shown so re-sorting by bytes
// still surfaces the real heavy hitters.
export async function getTopImages(
  range: AnalyticsRange = '24h',
  projectId?: string,
  filters?: AnalyticsFilters,
): Promise<TopImageRow[]> {
  return groupRollups(
    await rowsFor(range, projectId, filters),
    (row) => row.path,
    (path, groupedRows) => ({
      label: path,
      requests: groupedRows.reduce((sum, row) => sum + row.requests, 0),
      bytes: groupedRows.reduce((sum, row) => sum + Number(row.bytesOut), 0),
    }),
  )
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 20)
}

export async function getStatusSeries(
  range: AnalyticsRange,
  projectId?: string,
  filters?: AnalyticsFilters,
) {
  return rollupsToStatusSeries(await rowsFor(range, projectId, filters), range)
}

export async function getLatencyBins(
  range: AnalyticsRange = '24h',
  projectId?: string,
  filters?: AnalyticsFilters,
) {
  return rollupsToLatencyBins(await rowsFor(range, projectId, filters))
}

export async function getProjectStats(range: AnalyticsRange = '24h') {
  const out: Record<string, ProjectStat> = {}
  for (const row of groupRollups(
    await rowsFor(range),
    (r) => r.projectId,
    (projectId, groupedRows) => ({
      projectId,
      requests: groupedRows.reduce((sum, r) => sum + r.requests, 0),
      cached: groupedRows.reduce((sum, r) => sum + r.cachedRequests, 0),
    }),
  )) {
    out[row.projectId] = {
      requests: row.requests,
      hitRate: row.requests === 0 ? 0 : (row.cached / row.requests) * 100,
    }
  }
  return out
}

// Per-project rollup for the org-wide analytics breakdown.
export async function getProjectBreakdown(range: AnalyticsRange) {
  const [rows, projects] = await Promise.all([rowsFor(range), listProjects()])
  const nameById = new Map(projects.map((p) => [p.id, p.name]))
  return groupRollups(
    rows,
    (row) => row.projectId,
    (projectId, groupedRows) => {
      const summary = summarizeRollups(groupedRows)
      return {
        projectId,
        name: nameById.get(projectId) ?? projectId,
        requests: summary.totalRequests,
        bandwidthSaved: summary.bandwidthSaved,
        hitRate: summary.hitRate,
        avgLatency: summary.avg,
      }
    },
  ).sort((a, b) => b.requests - a.requests)
}

// Per-source-domain rollup for a single project's analytics. Only the project's
// own traffic is grouped; rows with no captured host are dropped.
export async function getDomainBreakdown(
  range: AnalyticsRange,
  projectId: string,
) {
  return groupRollups(
    await rowsFor(range, projectId),
    (row) => row.sourceHost,
    (domain, groupedRows) => {
      if (!domain) {
        return null
      }
      const summary = summarizeRollups(groupedRows)
      const lastSeen = groupedRows.reduce<Dayjs | null>((latest, row) => {
        const next = dayjs(row.bucketStart)
        return !latest || next.isAfter(latest) ? next : latest
      }, null)
      return {
        domain,
        requests: summary.totalRequests,
        bandwidthSaved: summary.bandwidthSaved,
        hitRate: summary.hitRate,
        avgLatency: summary.avg,
        lastSeen: lastSeen ? lastSeen.format('MMM D, HH:mm') : null,
      }
    },
  )
    .filter((r): r is DomainBreakdownRow => r !== null)
    .sort((a, b) => b.requests - a.requests)
}

interface HostTraffic {
  bandwidthSaved: number
  hitRate: number
  lastSeen: string | null
  requests: number
}

// Per-source-host traffic for one project + window, keyed by host. The action
// layer joins this with the project's allowlist to build the allowed-hosts
// table (hosts seen here that are not on the list surface as "not allowed").
export async function getHostTraffic(range: AnalyticsRange, projectId: string) {
  const map = new Map<string, HostTraffic>()
  for (const row of groupRollups(
    await rowsFor(range, projectId),
    (r) => r.sourceHost,
    (host, groupedRows) => ({ host, groupedRows }),
  )) {
    if (!row.host) {
      continue
    }
    const summary = summarizeRollups(row.groupedRows)
    const lastSeen = row.groupedRows.reduce<Dayjs | null>((latest, r) => {
      const next = dayjs(r.bucketStart)
      return !latest || next.isAfter(latest) ? next : latest
    }, null)
    map.set(row.host, {
      requests: summary.totalRequests,
      hitRate: summary.hitRate,
      bandwidthSaved: summary.bandwidthSaved,
      lastSeen: lastSeen ? lastSeen.format('MMM D, HH:mm') : null,
    })
  }
  return map
}

async function windowStats(
  projectId: string | undefined,
  gte: Date,
  lt?: Date,
) {
  const summary = summarizeRollups(
    await listAnalyticsRollups(prisma, { gte, lt, projectId }),
  )
  return {
    requests: summary.totalRequests,
    bandwidthIn: summary.bandwidthIn,
    bandwidthOut: summary.bandwidthOut,
    bandwidthSaved: summary.bandwidthSaved,
    hitRate: summary.hitRate,
    p95: summary.p95,
  }
}

// KPI trends compare the selected window with the immediately previous window.
export async function getDashboardKpis(
  range: AnalyticsRange,
  projectId?: string,
) {
  const { n, ms } = rollupRangeMeta(range)
  const windowMs = n * ms
  const now = dayjs()
  const [cur, prev] = await Promise.all([
    windowStats(projectId, now.subtract(windowMs, 'millisecond').toDate()),
    windowStats(
      projectId,
      now.subtract(2 * windowMs, 'millisecond').toDate(),
      now.subtract(windowMs, 'millisecond').toDate(),
    ),
  ])
  return {
    requests: { value: cur.requests, prev: prev.requests },
    bandwidthSaved: { value: cur.bandwidthSaved, prev: prev.bandwidthSaved },
    bandwidthIn: cur.bandwidthIn,
    bandwidthOut: cur.bandwidthOut,
    hitRate: { value: cur.hitRate, prev: prev.hitRate },
    p95: { value: cur.p95, prev: prev.p95 },
  }
}
