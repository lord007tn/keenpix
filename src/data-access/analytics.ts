import dayjs, { type Dayjs } from 'dayjs'
import { prisma } from '@/db'
import { Prisma } from '@/generated/prisma/client'
import type {
  AnalyticsRange,
  DomainBreakdownRow,
  LatencyBin,
  ProjectStat,
  TimePoint,
} from '@/shared/types'
import { listProjects } from './projects'

// Real aggregations over request_logs. Every query is scoped to one project when
// projectId is supplied, otherwise it stays org-wide.
interface RangeMeta {
  label: (d: Dayjs, i: number) => string
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
        label: (d) => d.format('ddd'),
      }
    case '30d':
      return {
        n: 30,
        ms: DAY,
        label: (d) => d.format('M/D'),
      }
    case '90d':
      return { n: 12, ms: 7 * DAY, label: (_d, i) => `W${i + 1}` }
    default:
      return {
        n: 24,
        ms: HOUR,
        label: (d) => d.format('HH:00'),
      }
  }
}

function sinceFor(range: AnalyticsRange): Date {
  const { n, ms } = rangeMeta(range)
  return dayjs()
    .subtract(n * ms, 'millisecond')
    .toDate()
}

export interface AnalyticsFilters {
  domain?: string[]
  format?: string[]
  status?: string[]
}

// Shared Prisma where builder for analytics windows, project scope, and filters.
function scope(since: Date, projectId?: string, filters?: AnalyticsFilters) {
  const where: {
    format?: { in: string[] }
    projectId?: string
    sourceHost?: { in: string[] }
    status?: { in: number[] }
    ts: { gte: Date }
  } = { ts: { gte: since } }
  if (projectId) {
    where.projectId = projectId
  }
  if (filters?.format && filters.format.length > 0) {
    where.format = { in: filters.format }
  }
  if (filters?.domain && filters.domain.length > 0) {
    where.sourceHost = { in: filters.domain }
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

// Build the SQL WHERE for the raw percentile query — mirrors scope() but emits
// parameterized SQL so percentiles can be computed in Postgres.
function latencyWhereSql(opts: {
  gte: Date
  lt?: Date
  projectId?: string
  filters?: AnalyticsFilters
}): Prisma.Sql {
  const conds: Prisma.Sql[] = [Prisma.sql`"ts" >= ${opts.gte}`]
  if (opts.lt) {
    conds.push(Prisma.sql`"ts" < ${opts.lt}`)
  }
  if (opts.projectId) {
    conds.push(Prisma.sql`"projectId" = ${opts.projectId}`)
  }
  if (opts.filters?.format && opts.filters.format.length > 0) {
    conds.push(Prisma.sql`"format" = ANY(${opts.filters.format})`)
  }
  if (opts.filters?.domain && opts.filters.domain.length > 0) {
    conds.push(Prisma.sql`"sourceHost" = ANY(${opts.filters.domain})`)
  }
  if (opts.filters?.status && opts.filters.status.length > 0) {
    const codes = opts.filters.status
      .map(Number)
      .filter((n) => !Number.isNaN(n))
    if (codes.length > 0) {
      conds.push(Prisma.sql`"status" = ANY(${codes})`)
    }
  }
  return Prisma.join(conds, ' AND ')
}

// Continuous (interpolated) latency percentiles computed in Postgres, so we
// never pull every row's latency into the app just to sort it.
async function latencyPercentiles(opts: {
  gte: Date
  lt?: Date
  projectId?: string
  filters?: AnalyticsFilters
}) {
  const rows = await prisma.$queryRaw<
    Array<{ p50: number | null; p95: number | null; p99: number | null }>
  >`
    SELECT
      percentile_cont(0.5) WITHIN GROUP (ORDER BY "latencyMs") AS p50,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY "latencyMs") AS p95,
      percentile_cont(0.99) WITHIN GROUP (ORDER BY "latencyMs") AS p99
    FROM "RequestLog"
    WHERE ${latencyWhereSql(opts)}
  `
  const r = rows[0]
  return {
    p50: Math.round(Number(r?.p50 ?? 0)),
    p95: Math.round(Number(r?.p95 ?? 0)),
    p99: Math.round(Number(r?.p99 ?? 0)),
  }
}

export async function getAnalyticsSummary(
  range: AnalyticsRange,
  projectId?: string,
  filters?: AnalyticsFilters,
) {
  const since = sinceFor(range)
  const where = scope(since, projectId, filters)
  const [agg, total, cachedCount, percentiles] = await Promise.all([
    prisma.requestLog.aggregate({
      where,
      _sum: { bytesIn: true, bytesOut: true },
    }),
    prisma.requestLog.count({ where }),
    prisma.requestLog.count({ where: { ...where, cached: true } }),
    latencyPercentiles({ gte: since, projectId, filters }),
  ])
  const bandwidthIn = agg._sum.bytesIn ?? 0
  const bandwidthOut = agg._sum.bytesOut ?? 0
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
    p50: percentiles.p50,
    p95: percentiles.p95,
    p99: percentiles.p99,
  }
}

export async function getTimeSeries(
  range: AnalyticsRange,
  projectId?: string,
  filters?: AnalyticsFilters,
) {
  const meta = rangeMeta(range)
  const sinceAt = dayjs().subtract(meta.n * meta.ms, 'millisecond')
  const since = sinceAt.toDate()
  const logs = await prisma.requestLog.findMany({
    where: scope(since, projectId, filters),
    select: { ts: true, cached: true, bytesIn: true, bytesOut: true },
  })

  const buckets: TimePoint[] = Array.from({ length: meta.n }, (_, i) => ({
    label: meta.label(sinceAt.add(i * meta.ms, 'millisecond'), i),
    requests: 0,
    cached: 0,
    optimized: 0,
    bandwidthIn: 0,
    bandwidthOut: 0,
  }))

  for (const l of logs) {
    const idx = Math.min(
      meta.n - 1,
      Math.max(0, Math.floor((l.ts.getTime() - sinceAt.valueOf()) / meta.ms)),
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
  heif: 'var(--chart-5)',
  svg: 'var(--accent-foreground)',
  tiff: 'var(--secondary-foreground)',
}

export async function getFormatDistribution(
  range: AnalyticsRange = '24h',
  projectId?: string,
  filters?: AnalyticsFilters,
) {
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

// Distinct formats and statuses that actually have data in the window. The
// format/status filters are deliberately ignored so the filter menus always
// offer every value present (the way Live Logs derives its options from data),
// rather than a fixed list that can include empty values or feel unhelpful.
export async function getAvailableFilters(
  range: AnalyticsRange = '24h',
  projectId?: string,
) {
  const since = sinceFor(range)
  const where = scope(since, projectId)
  const [formatRows, statusRows, domainRows] = await Promise.all([
    prisma.requestLog.groupBy({
      by: ['format'],
      where,
      _count: { _all: true },
    }),
    prisma.requestLog.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    }),
    prisma.requestLog.groupBy({
      by: ['sourceHost'],
      where,
      _count: { _all: true },
    }),
  ])
  return {
    formats: formatRows.map((r) => r.format).sort(),
    statuses: statusRows.map((r) => r.status).sort((a, b) => a - b),
    // Source domains actually observed in the window (incl. subdomains), so the
    // filter options match how origins are stored rather than the bare allowlist.
    domains: domainRows
      .map((r) => r.sourceHost)
      .filter((h): h is string => h !== null)
      .sort(),
  }
}

export async function getTopImages(
  range: AnalyticsRange = '24h',
  projectId?: string,
  filters?: AnalyticsFilters,
) {
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
) {
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

export async function getProjectStats(range: AnalyticsRange = '24h') {
  const since = sinceFor(range)
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

// Per-project rollup for the org-wide analytics breakdown.
export async function getProjectBreakdown(range: AnalyticsRange) {
  const since = sinceFor(range)
  const where = { ts: { gte: since } }
  const [byProject, hitsByProject, bytesByProject, projects] =
    await Promise.all([
      prisma.requestLog.groupBy({
        by: ['projectId'],
        where,
        _count: { _all: true },
        _avg: { latencyMs: true },
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
        avgLatency: Math.round(g._avg.latencyMs ?? 0),
      }
    })
    .sort((a, b) => b.requests - a.requests)
}

// Per-source-domain rollup for a single project's analytics. Only the project's
// own traffic is grouped; rows with no captured host are dropped.
export async function getDomainBreakdown(
  range: AnalyticsRange,
  projectId: string,
) {
  const since = sinceFor(range)
  const where = scope(since, projectId)
  const [byDomain, hitsByDomain, bytesByDomain] = await Promise.all([
    prisma.requestLog.groupBy({
      by: ['sourceHost'],
      where,
      _count: { _all: true },
      _avg: { latencyMs: true },
      _max: { ts: true },
    }),
    prisma.requestLog.groupBy({
      by: ['sourceHost'],
      where: { ...where, cached: true },
      _count: { _all: true },
    }),
    prisma.requestLog.groupBy({
      by: ['sourceHost'],
      where,
      _sum: { bytesIn: true, bytesOut: true },
    }),
  ])
  const hits = new Map(hitsByDomain.map((g) => [g.sourceHost, g._count._all]))
  const bytes = new Map(
    bytesByDomain.map((g) => [
      g.sourceHost,
      { in: g._sum.bytesIn ?? 0, out: g._sum.bytesOut ?? 0 },
    ]),
  )
  return byDomain
    .map((g) => {
      const domain = g.sourceHost
      if (domain === null) {
        return null
      }
      const requests = g._count._all
      const cached = hits.get(domain) ?? 0
      const b = bytes.get(domain) ?? { in: 0, out: 0 }
      return {
        domain,
        requests,
        bandwidthSaved: b.in - b.out,
        hitRate: requests === 0 ? 0 : (cached / requests) * 100,
        avgLatency: Math.round(g._avg.latencyMs ?? 0),
        lastSeen: g._max.ts ? dayjs(g._max.ts).format('MMM D, HH:mm') : null,
      }
    })
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
  const since = sinceFor(range)
  const where = scope(since, projectId)
  const [byHost, hitsByHost, bytesByHost, lastByHost] = await Promise.all([
    prisma.requestLog.groupBy({
      by: ['sourceHost'],
      where,
      _count: { _all: true },
    }),
    prisma.requestLog.groupBy({
      by: ['sourceHost'],
      where: { ...where, cached: true },
      _count: { _all: true },
    }),
    prisma.requestLog.groupBy({
      by: ['sourceHost'],
      where,
      _sum: { bytesIn: true, bytesOut: true },
    }),
    prisma.requestLog.groupBy({
      by: ['sourceHost'],
      where,
      _max: { ts: true },
    }),
  ])
  const hits = new Map(hitsByHost.map((g) => [g.sourceHost, g._count._all]))
  const bytes = new Map(
    bytesByHost.map((g) => [
      g.sourceHost,
      { in: g._sum.bytesIn ?? 0, out: g._sum.bytesOut ?? 0 },
    ]),
  )
  const last = new Map(lastByHost.map((g) => [g.sourceHost, g._max.ts]))
  const map = new Map<string, HostTraffic>()
  for (const g of byHost) {
    if (g.sourceHost === null) {
      continue
    }
    const requests = g._count._all
    const cached = hits.get(g.sourceHost) ?? 0
    const b = bytes.get(g.sourceHost) ?? { in: 0, out: 0 }
    const ts = last.get(g.sourceHost)
    map.set(g.sourceHost, {
      requests,
      hitRate: requests === 0 ? 0 : (cached / requests) * 100,
      bandwidthSaved: b.in - b.out,
      lastSeen: ts ? dayjs(ts).format('MMM D, HH:mm') : null,
    })
  }
  return map
}

async function windowStats(
  projectId: string | undefined,
  gte: Date,
  lt?: Date,
) {
  const where = {
    ...(projectId ? { projectId } : {}),
    ts: lt ? { gte, lt } : { gte },
  }
  const [agg, total, cached, percentiles] = await Promise.all([
    prisma.requestLog.aggregate({
      where,
      _sum: { bytesIn: true, bytesOut: true },
    }),
    prisma.requestLog.count({ where }),
    prisma.requestLog.count({ where: { ...where, cached: true } }),
    latencyPercentiles({ gte, lt, projectId }),
  ])
  const bIn = agg._sum.bytesIn ?? 0
  const bOut = agg._sum.bytesOut ?? 0
  return {
    requests: total,
    bandwidthIn: bIn,
    bandwidthOut: bOut,
    bandwidthSaved: bIn - bOut,
    hitRate: total === 0 ? 0 : (cached / total) * 100,
    p95: percentiles.p95,
  }
}

// KPI trends compare the selected window with the immediately previous window.
export async function getDashboardKpis(
  range: AnalyticsRange,
  projectId?: string,
) {
  const { n, ms } = rangeMeta(range)
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
