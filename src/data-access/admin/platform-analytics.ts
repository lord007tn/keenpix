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
  const { _sum } = await prisma.analyticsRollupHourly.aggregate({
    where: { bucketStart: { gte } },
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
