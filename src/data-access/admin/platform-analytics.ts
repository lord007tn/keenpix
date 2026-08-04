import { prisma } from '@/db'
import {
  emptyLatencyBucketCounts,
  LATENCY_BUCKETS,
  type LatencyBucketCounts,
  type LatencyBucketField,
} from '@/helpers/analytics/latency-buckets'
import type {
  BucketAgg,
  RollupSummaryAgg,
} from '@/helpers/analytics/rollup-shapers'

// Cross-org (platform-wide) analytics for the operator console. These are the
// only rollup reads that deliberately omit the org scope — every tenant-facing
// query mandates orgId. Guarded upstream by requireSuperAdmin.

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

export async function aggregatePlatformSummary(
  gte: Date,
  lt?: Date,
): Promise<RollupSummaryAgg> {
  const rows = await prisma.analyticsRollupHourly.groupBy({
    by: ['status'],
    where: { bucketStart: lt ? { gte, lt } : { gte } },
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

export async function groupPlatformByBucket(
  gte: Date,
  lt?: Date,
): Promise<BucketAgg[]> {
  const rows = await prisma.analyticsRollupHourly.groupBy({
    by: ['bucketStart', 'status'],
    where: { bucketStart: lt ? { gte, lt } : { gte } },
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

// Top orgs by request volume in the window — feeds the "top customers" list.
export async function groupPlatformByOrg(gte: Date, lt?: Date, take = 8) {
  const [rows, edgeRows] = await Promise.all([
    prisma.analyticsRollupHourly.groupBy({
      by: ['orgId', 'status'],
      where: { bucketStart: lt ? { gte, lt } : { gte } },
      _sum: { requests: true, cachedRequests: true, bytesOut: true },
    }),
    prisma.projectEdgeRollupHourly.groupBy({
      by: ['orgId', 'stage'],
      where: { bucketStart: lt ? { gte, lt } : { gte } },
      _sum: { requests: true, bytes: true },
    }),
  ])
  const organizations = new Map<
    string,
    {
      attemptedRequests: number
      bytesOut: number
      cachedRequests: number
      orgId: string
      requests: number
    }
  >()
  for (const row of rows) {
    const organization = organizations.get(row.orgId) ?? {
      orgId: row.orgId,
      attemptedRequests: 0,
      requests: 0,
      cachedRequests: 0,
      bytesOut: 0,
    }
    organization.attemptedRequests += row._sum.requests ?? 0
    if (row.status >= 200 && row.status < 300) {
      organization.requests += row._sum.requests ?? 0
      organization.cachedRequests += row._sum.cachedRequests ?? 0
      organization.bytesOut += Number(row._sum.bytesOut ?? 0n)
    }
    organizations.set(row.orgId, organization)
  }
  for (const row of edgeRows) {
    if (row.stage !== 'edge') {
      continue
    }
    const organization = organizations.get(row.orgId) ?? {
      orgId: row.orgId,
      attemptedRequests: 0,
      requests: 0,
      cachedRequests: 0,
      bytesOut: 0,
    }
    const requests = row._sum.requests ?? 0
    organization.attemptedRequests += requests
    organization.requests += requests
    organization.cachedRequests += requests
    organization.bytesOut += Number(row._sum.bytes ?? 0n)
    organizations.set(row.orgId, organization)
  }
  return [...organizations.values()]
    .sort((a, b) => b.requests - a.requests)
    .slice(0, take)
}

export async function platformAnalyticsCoverageStart() {
  const result = await prisma.analyticsRollupHourly.aggregate({
    _min: { bucketStart: true },
  })
  return result._min.bucketStart
}
