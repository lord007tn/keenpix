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
): Promise<RollupSummaryAgg> {
  const rows = await prisma.analyticsRollupHourly.groupBy({
    by: ['status'],
    where: { bucketStart: { gte } },
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
      sum.cachedRequests += row._sum.cachedRequests ?? 0
      sum.optimizedRequests += row._sum.optimizedRequests ?? 0
      sum.bytesIn += row._sum.bytesIn ?? 0n
      sum.bytesOut += row._sum.bytesOut ?? 0n
      sum.bytesSaved += row._sum.bytesSaved ?? 0n
      sum.latencyMsSum += row._sum.latencyMsSum ?? 0
      if (row.status >= 200 && row.status < 300) {
        sum.successfulRequests += row._sum.requests ?? 0
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

export async function groupPlatformByBucket(gte: Date): Promise<BucketAgg[]> {
  const rows = await prisma.analyticsRollupHourly.groupBy({
    by: ['bucketStart'],
    where: { bucketStart: { gte } },
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

// Top orgs by request volume in the window — feeds the "top customers" list.
export async function groupPlatformByOrg(gte: Date, take = 8) {
  const rows = await prisma.analyticsRollupHourly.groupBy({
    by: ['orgId'],
    where: { bucketStart: { gte } },
    _sum: { requests: true, cachedRequests: true, bytesOut: true },
    orderBy: [{ _sum: { requests: 'desc' } }],
    take,
  })
  return rows.map((r) => ({
    orgId: r.orgId,
    requests: r._sum.requests ?? 0,
    cachedRequests: r._sum.cachedRequests ?? 0,
    bytesOut: Number(r._sum.bytesOut ?? 0n),
  }))
}
