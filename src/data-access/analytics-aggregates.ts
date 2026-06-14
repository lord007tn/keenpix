import { prisma } from '@/db'
import type { Prisma } from '@/generated/prisma/client'
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
  projectId?: string
}

function whereFor(opts: WindowOpts): Prisma.AnalyticsRollupHourlyWhereInput {
  const where: Prisma.AnalyticsRollupHourlyWhereInput = {
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
  if (f?.status && f.status.length > 0) {
    const codes = f.status.map(Number).filter((n) => !Number.isNaN(n))
    if (codes.length > 0) {
      where.status = { in: codes }
    }
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
  const { _sum } = await prisma.analyticsRollupHourly.aggregate({
    where: whereFor(opts),
    _sum: {
      requests: true,
      cachedRequests: true,
      bytesIn: true,
      bytesOut: true,
      bytesSaved: true,
      latencyMsSum: true,
      ...LATENCY_SUM_SELECT,
    },
  })
  return {
    requests: _sum.requests ?? 0,
    cachedRequests: _sum.cachedRequests ?? 0,
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
    by: ['bucketStart'],
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
  return rows.map((r) => ({
    bucketStart: r.bucketStart,
    requests: r._sum.requests ?? 0,
    cachedRequests: r._sum.cachedRequests ?? 0,
    optimizedRequests: r._sum.optimizedRequests ?? 0,
    bytesIn: Number(r._sum.bytesIn ?? 0n),
    bytesOut: Number(r._sum.bytesOut ?? 0n),
    bytesSaved: Number(r._sum.bytesSaved ?? 0n),
    latency: latencyCountsFrom(r._sum),
  }))
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
  const [formats, statuses, hosts] = await Promise.all([
    prisma.analyticsRollupHourly.groupBy({ by: ['format'], where }),
    prisma.analyticsRollupHourly.groupBy({ by: ['status'], where }),
    prisma.analyticsRollupHourly.groupBy({ by: ['sourceHost'], where }),
  ])
  return {
    formats: formats.map((f) => f.format).sort(),
    statuses: statuses.map((s) => s.status).sort((a, b) => a - b),
    domains: hosts
      .map((h) => h.sourceHost)
      .filter(Boolean)
      .sort(),
  }
}

export async function groupRollupsByProject(
  opts: WindowOpts,
): Promise<ProjectAgg[]> {
  const rows = await prisma.analyticsRollupHourly.groupBy({
    by: ['projectId'],
    where: whereFor(opts),
    _sum: {
      requests: true,
      cachedRequests: true,
      bytesSaved: true,
      latencyMsSum: true,
    },
  })
  return rows.map((r) => ({
    projectId: r.projectId,
    requests: r._sum.requests ?? 0,
    cachedRequests: r._sum.cachedRequests ?? 0,
    bytesSaved: Number(r._sum.bytesSaved ?? 0n),
    latencyMsSum: r._sum.latencyMsSum ?? 0,
  }))
}

export async function groupRollupsByHost(opts: WindowOpts): Promise<HostAgg[]> {
  const rows = await prisma.analyticsRollupHourly.groupBy({
    by: ['sourceHost'],
    where: whereFor(opts),
    _sum: {
      requests: true,
      cachedRequests: true,
      bytesSaved: true,
      latencyMsSum: true,
    },
    _max: { bucketStart: true },
  })
  return rows.map((r) => ({
    sourceHost: r.sourceHost,
    requests: r._sum.requests ?? 0,
    cachedRequests: r._sum.cachedRequests ?? 0,
    bytesSaved: Number(r._sum.bytesSaved ?? 0n),
    latencyMsSum: r._sum.latencyMsSum ?? 0,
    lastSeen: r._max.bucketStart,
  }))
}
