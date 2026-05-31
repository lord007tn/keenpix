/**
 * Analytics data-access — real aggregations over request_logs (Prisma/Postgres).
 * Every query is scoped to a project when a projectId is supplied, else org-wide.
 */
import { prisma } from '@/db'
import type {
  AnalyticsRange,
  AnalyticsSummary,
  DashboardKpis,
  FormatSlice,
  LatencyBin,
  ProjectBreakdownRow,
  ProjectStat,
  TimePoint,
  TopItem,
} from '@/shared/types'
import { listProjects } from './projects'

interface RangeMeta {
  label: (d: Date, i: number) => string
  ms: number
  n: number
}

const DAY = 86_400_000
const HOUR = 3_600_000

function rangeMeta(range: AnalyticsRange): RangeMeta {
  switch (range) {
    case '7d':
      return {
        n: 7,
        ms: DAY,
        label: (d) =>
          ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()],
      }
    case '30d':
      return {
        n: 30,
        ms: DAY,
        label: (d) => `${d.getMonth() + 1}/${d.getDate()}`,
      }
    case '90d':
      return { n: 12, ms: 7 * DAY, label: (_d, i) => `W${i + 1}` }
    default:
      return {
        n: 24,
        ms: HOUR,
        label: (d) => `${String(d.getHours()).padStart(2, '0')}:00`,
      }
  }
}

function sinceFor(range: AnalyticsRange): Date {
  const { n, ms } = rangeMeta(range)
  return new Date(Date.now() - n * ms)
}

export interface AnalyticsFilters {
  format?: string[]
  status?: string[]
}

/** Build a `where` scoped to the window, optionally a project, and any filters. */
function scope(since: Date, projectId?: string, filters?: AnalyticsFilters) {
  const where: {
    format?: { in: string[] }
    projectId?: string
    status?: { in: number[] }
    ts: { gte: Date }
  } = { ts: { gte: since } }
  if (projectId) {
    where.projectId = projectId
  }
  if (filters?.format && filters.format.length > 0) {
    where.format = { in: filters.format }
  }
  if (filters?.status && filters.status.length > 0) {
    const codes = filters.status.map(Number).filter((n) => !Number.isNaN(n))
    // All-invalid input must be a no-op, not `in: []` (which matches zero rows
    // and would blank the page).
    if (codes.length > 0) {
      where.status = { in: codes }
    }
  }
  return where
}

/** Nearest-rank percentile over an ascending-sorted array (ms). */
function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) {
    return 0
  }
  const idx = Math.min(
    sortedAsc.length - 1,
    Math.max(0, Math.ceil((p / 100) * sortedAsc.length) - 1),
  )
  return Math.round(sortedAsc[idx])
}

export async function getAnalyticsSummary(
  range: AnalyticsRange,
  projectId?: string,
  filters?: AnalyticsFilters,
): Promise<AnalyticsSummary> {
  const since = sinceFor(range)
  const where = scope(since, projectId, filters)
  const [agg, total, cachedCount, latencyRows] = await Promise.all([
    prisma.requestLog.aggregate({
      where,
      _sum: { bytesIn: true, bytesOut: true },
    }),
    prisma.requestLog.count({ where }),
    prisma.requestLog.count({ where: { ...where, cached: true } }),
    prisma.requestLog.findMany({ where, select: { latencyMs: true } }),
  ])
  const bandwidthIn = agg._sum.bytesIn ?? 0
  const bandwidthOut = agg._sum.bytesOut ?? 0
  const latencies = latencyRows.map((r) => r.latencyMs).sort((a, b) => a - b)
  return {
    totalRequests: total,
    bandwidthIn,
    bandwidthOut,
    bandwidthSaved: bandwidthIn - bandwidthOut,
    hitRate: total === 0 ? 0 : (cachedCount / total) * 100,
    savingsPct:
      bandwidthIn === 0
        ? 0
        : ((bandwidthIn - bandwidthOut) / bandwidthIn) * 100,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
  }
}

export async function getTimeSeries(
  range: AnalyticsRange,
  projectId?: string,
  filters?: AnalyticsFilters,
): Promise<TimePoint[]> {
  const meta = rangeMeta(range)
  const since = new Date(Date.now() - meta.n * meta.ms)
  const logs = await prisma.requestLog.findMany({
    where: scope(since, projectId, filters),
    select: { ts: true, cached: true, bytesIn: true, bytesOut: true },
  })

  const buckets: TimePoint[] = Array.from({ length: meta.n }, (_, i) => ({
    label: meta.label(new Date(since.getTime() + i * meta.ms), i),
    requests: 0,
    cached: 0,
    optimized: 0,
    bandwidthIn: 0,
    bandwidthOut: 0,
  }))

  for (const l of logs) {
    const idx = Math.min(
      meta.n - 1,
      Math.max(0, Math.floor((l.ts.getTime() - since.getTime()) / meta.ms)),
    )
    const b = buckets[idx]
    b.requests += 1
    if (l.cached) {
      b.cached += 1
    } else {
      b.optimized += 1
    }
    b.bandwidthIn += l.bytesIn
    b.bandwidthOut += l.bytesOut
  }
  return buckets
}

const FORMAT_COLORS: Record<string, string> = {
  avif: 'var(--chart-1)',
  webp: 'var(--chart-2)',
  jpeg: 'var(--chart-4)',
  png: 'var(--chart-3)',
  gif: 'var(--muted-foreground)',
}

export async function getFormatDistribution(
  range: AnalyticsRange = '24h',
  projectId?: string,
  filters?: AnalyticsFilters,
): Promise<FormatSlice[]> {
  const since = sinceFor(range)
  const grouped = await prisma.requestLog.groupBy({
    by: ['format'],
    where: scope(since, projectId, filters),
    _count: { _all: true },
  })
  const total = grouped.reduce((a, g) => a + g._count._all, 0) || 1
  return grouped
    .map((g) => ({
      label: g.format.toUpperCase(),
      value: Math.round((g._count._all / total) * 1000) / 10,
      color: FORMAT_COLORS[g.format] ?? 'var(--muted-foreground)',
    }))
    .sort((a, b) => b.value - a.value)
}

export async function getTopImages(
  range: AnalyticsRange = '24h',
  projectId?: string,
  filters?: AnalyticsFilters,
): Promise<TopItem[]> {
  const since = sinceFor(range)
  const grouped = await prisma.requestLog.groupBy({
    by: ['path'],
    where: scope(since, projectId, filters),
    _count: { _all: true },
    orderBy: { _count: { path: 'desc' } },
    take: 8,
  })
  return grouped.map((g) => ({ label: g.path, value: g._count._all }))
}

export async function getLatencyBins(
  range: AnalyticsRange = '24h',
  projectId?: string,
  filters?: AnalyticsFilters,
): Promise<LatencyBin[]> {
  const since = sinceFor(range)
  const rows = await prisma.requestLog.findMany({
    where: scope(since, projectId, filters),
    select: { latencyMs: true },
  })
  const edges = [5, 10, 20, 35, 55, 80, 120, 180, 260, 380, 540, 800, 1100]
  const labels = [
    '<5ms',
    '10',
    '20',
    '35',
    '55',
    '80',
    '120',
    '180',
    '260',
    '380',
    '540',
    '800',
    '>1s',
  ]
  const bins: LatencyBin[] = edges.map((bucket, i) => ({
    bucket,
    label: labels[i],
    value: 0,
  }))
  for (const r of rows) {
    let i = edges.findIndex((e) => r.latencyMs <= e)
    if (i === -1) {
      i = edges.length - 1
    }
    bins[i].value += 1
  }
  return bins
}

/** Real per-project 24h request count + cache hit-rate for the dashboard cards. */
export async function getProjectStats(): Promise<Record<string, ProjectStat>> {
  const since = new Date(Date.now() - DAY)
  const [byProject, hitsByProject] = await Promise.all([
    prisma.requestLog.groupBy({
      by: ['projectId'],
      where: { ts: { gte: since } },
      _count: { _all: true },
    }),
    prisma.requestLog.groupBy({
      by: ['projectId'],
      where: { ts: { gte: since }, cached: true },
      _count: { _all: true },
    }),
  ])
  const hits = new Map(hitsByProject.map((g) => [g.projectId, g._count._all]))
  const out: Record<string, ProjectStat> = {}
  for (const g of byProject) {
    const requests = g._count._all
    const cached = hits.get(g.projectId) ?? 0
    out[g.projectId] = {
      requests,
      hitRate: requests === 0 ? 0 : (cached / requests) * 100,
    }
  }
  return out
}

/**
 * Per-project rollup for the "All projects" analytics view — requests, cache
 * hit-rate, and bandwidth saved over the window, joined with project names.
 */
export async function getProjectBreakdown(
  range: AnalyticsRange,
): Promise<ProjectBreakdownRow[]> {
  const since = sinceFor(range)
  const where = { ts: { gte: since } }
  const [byProject, hitsByProject, bytesByProject, projects] =
    await Promise.all([
      prisma.requestLog.groupBy({
        by: ['projectId'],
        where,
        _count: { _all: true },
      }),
      prisma.requestLog.groupBy({
        by: ['projectId'],
        where: { ...where, cached: true },
        _count: { _all: true },
      }),
      prisma.requestLog.groupBy({
        by: ['projectId'],
        where,
        _sum: { bytesIn: true, bytesOut: true },
      }),
      listProjects(),
    ])
  const hits = new Map(hitsByProject.map((g) => [g.projectId, g._count._all]))
  const bytes = new Map(
    bytesByProject.map((g) => [
      g.projectId,
      { in: g._sum.bytesIn ?? 0, out: g._sum.bytesOut ?? 0 },
    ]),
  )
  const nameById = new Map(projects.map((p) => [p.id, p.name]))
  return byProject
    .map((g) => {
      const requests = g._count._all
      const cached = hits.get(g.projectId) ?? 0
      const b = bytes.get(g.projectId) ?? { in: 0, out: 0 }
      return {
        projectId: g.projectId,
        name: nameById.get(g.projectId) ?? g.projectId,
        requests,
        bandwidthSaved: b.in - b.out,
        hitRate: requests === 0 ? 0 : (cached / requests) * 100,
      }
    })
    .sort((a, b) => b.requests - a.requests)
}

interface WindowStats {
  bandwidthSaved: number
  hitRate: number
  p95: number
  requests: number
}

/** Rollup of one time window — used to compute current-vs-previous KPI trends. */
async function windowStats(where: object): Promise<WindowStats> {
  const [agg, total, cached, latRows] = await Promise.all([
    prisma.requestLog.aggregate({
      where,
      _sum: { bytesIn: true, bytesOut: true },
    }),
    prisma.requestLog.count({ where }),
    prisma.requestLog.count({ where: { ...where, cached: true } }),
    prisma.requestLog.findMany({ where, select: { latencyMs: true } }),
  ])
  const bIn = agg._sum.bytesIn ?? 0
  const bOut = agg._sum.bytesOut ?? 0
  const lat = latRows.map((r) => r.latencyMs).sort((a, b) => a - b)
  return {
    requests: total,
    bandwidthSaved: bIn - bOut,
    hitRate: total === 0 ? 0 : (cached / total) * 100,
    p95: percentile(lat, 95),
  }
}

/**
 * The four dashboard KPI cards with a REAL trend: each metric over the current
 * window plus the immediately-preceding window of equal length.
 */
export async function getDashboardKpis(
  range: AnalyticsRange,
  projectId?: string,
): Promise<DashboardKpis> {
  const { n, ms } = rangeMeta(range)
  const windowMs = n * ms
  const now = Date.now()
  const base = projectId ? { projectId } : {}
  const [cur, prev] = await Promise.all([
    windowStats({ ...base, ts: { gte: new Date(now - windowMs) } }),
    windowStats({
      ...base,
      ts: { gte: new Date(now - 2 * windowMs), lt: new Date(now - windowMs) },
    }),
  ])
  return {
    requests: { value: cur.requests, prev: prev.requests },
    bandwidthSaved: { value: cur.bandwidthSaved, prev: prev.bandwidthSaved },
    hitRate: { value: cur.hitRate, prev: prev.hitRate },
    p95: { value: cur.p95, prev: prev.p95 },
  }
}
