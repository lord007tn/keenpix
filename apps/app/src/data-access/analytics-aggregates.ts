import { prisma } from '@keenpix/database'
import type { Prisma } from '@keenpix/database/client'
import {
  emptyLatencyBucketCounts,
  LATENCY_BUCKETS,
  type LatencyBucketCounts,
  type LatencyBucketField,
} from '@/helpers/analytics/latency-buckets'
import type {
  BucketAgg,
  BucketStatusAgg,
  CountryAgg,
  FormatAgg,
  HostAgg,
  ProjectAgg,
  RollupSummaryAgg,
} from '@/helpers/analytics/rollup-shapers'
import { getAnalyticsStatusCodes } from '@/helpers/analytics/status-filters'
import type { TopImageRow } from '@/shared/types'
import type { AnalyticsFilters } from './analytics'

// Analytics read directly from aggregated Postgres rollups: every metric is a
// GROUP BY / aggregate query, so the database returns a handful of pre-summed
// rows instead of the full per-(hour × project × host × country × path × format
// × status) fan-out. The pure shapers in helpers/analytics/rollup-shapers turn
// these summed rows into the page's series/distributions/breakdowns.

export interface WindowOpts {
  filters?: AnalyticsFilters
  gte: Date
  lt?: Date
  orgId: string
  projectId?: string
}

export async function analyticsCoverageStart(opts: {
  orgId: string
  projectId?: string
}) {
  const { _min } = await prisma.analyticsRollupHourly.aggregate({
    where: { orgId: opts.orgId, projectId: opts.projectId },
    _min: { bucketStart: true },
  })
  return _min.bucketStart
}

function whereFor(opts: WindowOpts): Prisma.AnalyticsRollupHourlyWhereInput {
  // Tenant scope is mandatory and comes first: every rollup row is org-scoped,
  // so no aggregate can sum another tenant's traffic.
  const where: Prisma.AnalyticsRollupHourlyWhereInput = {
    orgId: opts.orgId,
    bucketStart: opts.lt ? { gte: opts.gte, lt: opts.lt } : { gte: opts.gte },
  }
  if (opts.projectId) {
    where.projectId = opts.projectId
  }
  const f = opts.filters
  if (f?.format && f.format.length > 0) {
    where.format = { in: f.format }
  }
  if (f?.domain && f.domain.length > 0) {
    where.sourceHost = { in: f.domain }
  }
  if (f?.country && f.country.length > 0) {
    where.country = {
      in: f.country.map((country) => (country === 'Unknown' ? '' : country)),
    }
  }
  const statusCodes = getAnalyticsStatusCodes(f)
  if (statusCodes) {
    where.status = { in: statusCodes }
  }
  return where
}

// `_sum: { latencyLe5: true, ... }` for every histogram column.
const LATENCY_SUM_SELECT = Object.fromEntries(
  LATENCY_BUCKETS.map((b) => [b.field, true]),
) as Record<LatencyBucketField, true>

function latencyCountsFrom(
  sum: Partial<Record<LatencyBucketField, number | null>>,
): LatencyBucketCounts {
  const counts = emptyLatencyBucketCounts()
  for (const b of LATENCY_BUCKETS) {
    counts[b.field] = sum[b.field] ?? 0
  }
  return counts
}

// One aggregate row → window totals + summed latency histogram.
export async function aggregateRollupSummary(
  opts: WindowOpts,
): Promise<RollupSummaryAgg> {
  const rows = await prisma.analyticsRollupHourly.groupBy({
    by: ['status'],
    where: whereFor(opts),
    _sum: {
      requests: true,
      cachedRequests: true,
      optimizedRequests: true,
      bytesIn: true,
      bytesOut: true,
      bytesSaved: true,
      latencyMsSum: true,
      ...LATENCY_SUM_SELECT,
    },
  })
  const _sum = rows.reduce(
    (sum, row) => {
      sum.requests += row._sum.requests ?? 0
      sum.bytesIn += row._sum.bytesIn ?? 0n
      sum.bytesOut += row._sum.bytesOut ?? 0n
      sum.bytesSaved += row._sum.bytesSaved ?? 0n
      sum.latencyMsSum += row._sum.latencyMsSum ?? 0
      if (row.status >= 200 && row.status < 300) {
        sum.successfulRequests += row._sum.requests ?? 0
        sum.cachedRequests += row._sum.cachedRequests ?? 0
        sum.optimizedRequests += row._sum.optimizedRequests ?? 0
      }
      for (const bucket of LATENCY_BUCKETS) {
        sum[bucket.field] += row._sum[bucket.field] ?? 0
      }
      return sum
    },
    {
      requests: 0,
      cachedRequests: 0,
      optimizedRequests: 0,
      successfulRequests: 0,
      bytesIn: 0n,
      bytesOut: 0n,
      bytesSaved: 0n,
      latencyMsSum: 0,
      ...emptyLatencyBucketCounts(),
    },
  )
  return {
    requests: _sum.requests ?? 0,
    cachedRequests: _sum.cachedRequests ?? 0,
    optimizedRequests: _sum.optimizedRequests ?? 0,
    successfulRequests: _sum.successfulRequests,
    bytesIn: Number(_sum.bytesIn ?? 0n),
    bytesOut: Number(_sum.bytesOut ?? 0n),
    bytesSaved: Number(_sum.bytesSaved ?? 0n),
    latencyMsSum: _sum.latencyMsSum ?? 0,
    latency: latencyCountsFrom(_sum),
  }
}

// Per-hour sums; powers both the request series and the latency trend.
export async function groupRollupsByBucket(
  opts: WindowOpts,
): Promise<BucketAgg[]> {
  const rows = await prisma.analyticsRollupHourly.groupBy({
    by: ['bucketStart', 'status'],
    where: whereFor(opts),
    _sum: {
      requests: true,
      cachedRequests: true,
      optimizedRequests: true,
      bytesIn: true,
      bytesOut: true,
      bytesSaved: true,
      ...LATENCY_SUM_SELECT,
    },
  })
  const buckets = new Map<number, BucketAgg>()
  for (const row of rows) {
    const key = row.bucketStart.getTime()
    const bucket = buckets.get(key) ?? {
      bucketStart: row.bucketStart,
      requests: 0,
      cachedRequests: 0,
      optimizedRequests: 0,
      bytesIn: 0,
      bytesOut: 0,
      bytesSaved: 0,
      latency: emptyLatencyBucketCounts(),
    }
    bucket.requests += row._sum.requests ?? 0
    if (row.status >= 200 && row.status < 300) {
      bucket.cachedRequests += row._sum.cachedRequests ?? 0
      bucket.optimizedRequests += row._sum.optimizedRequests ?? 0
    }
    bucket.bytesIn += Number(row._sum.bytesIn ?? 0n)
    bucket.bytesOut += Number(row._sum.bytesOut ?? 0n)
    bucket.bytesSaved += Number(row._sum.bytesSaved ?? 0n)
    for (const latencyBucket of LATENCY_BUCKETS) {
      bucket.latency[latencyBucket.field] += row._sum[latencyBucket.field] ?? 0
    }
    buckets.set(key, bucket)
  }
  return [...buckets.values()]
}

export async function groupRollupsByBucketStatus(
  opts: WindowOpts,
): Promise<BucketStatusAgg[]> {
  const rows = await prisma.analyticsRollupHourly.groupBy({
    by: ['bucketStart', 'status'],
    where: whereFor(opts),
    _sum: { requests: true },
  })
  return rows.map((r) => ({
    bucketStart: r.bucketStart,
    status: r.status,
    requests: r._sum.requests ?? 0,
  }))
}

export async function groupRollupsByFormat(
  opts: WindowOpts,
): Promise<FormatAgg[]> {
  const rows = await prisma.analyticsRollupHourly.groupBy({
    by: ['format'],
    where: whereFor(opts),
    _sum: { requests: true, bytesSaved: true },
  })
  return rows.map((r) => ({
    format: r.format,
    requests: r._sum.requests ?? 0,
    saved: Number(r._sum.bytesSaved ?? 0n),
  }))
}

// The DB ranks + caps the top images; ties broken by path for determinism.
export async function groupRollupsByPath(
  opts: WindowOpts,
): Promise<TopImageRow[]> {
  const rows = await prisma.analyticsRollupHourly.groupBy({
    by: ['path'],
    where: whereFor(opts),
    _sum: { requests: true, bytesOut: true },
    orderBy: [{ _sum: { requests: 'desc' } }, { path: 'asc' }],
    take: 20,
  })
  return rows.map((r) => ({
    label: r.path,
    requests: r._sum.requests ?? 0,
    bytes: Number(r._sum.bytesOut ?? 0n),
  }))
}

export async function groupRollupsByCountry(
  opts: WindowOpts,
): Promise<CountryAgg[]> {
  const rows = await prisma.analyticsRollupHourly.groupBy({
    by: ['country'],
    where: whereFor(opts),
    _sum: { requests: true, bytesSaved: true },
  })
  return rows.map((r) => ({
    country: r.country,
    requests: r._sum.requests ?? 0,
    saved: Number(r._sum.bytesSaved ?? 0n),
  }))
}

// Distinct filter values present in the (unfiltered) window.
export async function listAvailableFilters(opts: WindowOpts) {
  const where = whereFor(opts)
  const [formats, statuses, hosts, countries] = await Promise.all([
    prisma.analyticsRollupHourly.groupBy({ by: ['format'], where }),
    prisma.analyticsRollupHourly.groupBy({ by: ['status'], where }),
    prisma.analyticsRollupHourly.groupBy({ by: ['sourceHost'], where }),
    prisma.analyticsRollupHourly.groupBy({ by: ['country'], where }),
  ])
  return {
    formats: formats.map((f) => f.format).sort(),
    statuses: statuses.map((s) => s.status).sort((a, b) => a - b),
    domains: hosts
      .map((h) => h.sourceHost)
      .filter(Boolean)
      .sort(),
    countries: countries.map((country) => country.country || 'Unknown').sort(),
  }
}

export async function groupRollupsByProject(
  opts: WindowOpts,
): Promise<ProjectAgg[]> {
  const rows = await prisma.analyticsRollupHourly.groupBy({
    by: ['projectId', 'status'],
    where: whereFor(opts),
    _sum: {
      requests: true,
      cachedRequests: true,
      optimizedRequests: true,
      bytesSaved: true,
      latencyMsSum: true,
    },
  })
  const projects = new Map<string, ProjectAgg>()
  for (const row of rows) {
    const project = projects.get(row.projectId) ?? {
      projectId: row.projectId,
      requests: 0,
      cachedRequests: 0,
      optimizedRequests: 0,
      bytesSaved: 0,
      latencyMsSum: 0,
    }
    project.requests += row._sum.requests ?? 0
    if (row.status >= 200 && row.status < 300) {
      project.cachedRequests += row._sum.cachedRequests ?? 0
      project.optimizedRequests += row._sum.optimizedRequests ?? 0
    }
    project.bytesSaved += Number(row._sum.bytesSaved ?? 0n)
    project.latencyMsSum += row._sum.latencyMsSum ?? 0
    projects.set(row.projectId, project)
  }
  return [...projects.values()]
}

export async function groupRollupsByHost(opts: WindowOpts): Promise<HostAgg[]> {
  const rows = await prisma.analyticsRollupHourly.groupBy({
    by: ['sourceHost', 'status'],
    where: whereFor(opts),
    _sum: {
      requests: true,
      cachedRequests: true,
      optimizedRequests: true,
      bytesSaved: true,
      latencyMsSum: true,
    },
    _max: { bucketStart: true },
  })
  const hosts = new Map<string, HostAgg>()
  for (const row of rows) {
    const host = hosts.get(row.sourceHost) ?? {
      sourceHost: row.sourceHost,
      requests: 0,
      cachedRequests: 0,
      optimizedRequests: 0,
      bytesSaved: 0,
      latencyMsSum: 0,
      lastSeen: null,
    }
    host.requests += row._sum.requests ?? 0
    if (row.status >= 200 && row.status < 300) {
      host.cachedRequests += row._sum.cachedRequests ?? 0
      host.optimizedRequests += row._sum.optimizedRequests ?? 0
    }
    host.bytesSaved += Number(row._sum.bytesSaved ?? 0n)
    host.latencyMsSum += row._sum.latencyMsSum ?? 0
    if (
      row._max.bucketStart &&
      (!host.lastSeen || row._max.bucketStart > host.lastSeen)
    ) {
      host.lastSeen = row._max.bucketStart
    }
    hosts.set(row.sourceHost, host)
  }
  return [...hosts.values()]
}
