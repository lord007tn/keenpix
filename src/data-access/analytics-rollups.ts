import dayjs from 'dayjs'
import type { Prisma } from '@/generated/prisma/client'
import {
  approximateLatencyPercentile,
  emptyLatencyBucketCounts,
  LATENCY_BUCKETS,
  type LatencyBucketCounts,
  latencyBucketField,
} from '@/helpers/analytics/latency-buckets'
import type { AnalyticsRange, LatencyBin, TimePoint } from '@/shared/types'
import type { AnalyticsFilters } from './analytics'
import type { NewRequestLog } from './request-logs'

const DAY = 86_400_000
const HOUR = 3_600_000

interface RangeMeta {
  label: (date: Date, index: number) => string
  ms: number
  n: number
}

export interface RollupRow {
  bucketStart: Date
  bytesIn: bigint
  bytesOut: bigint
  bytesSaved: bigint
  cachedRequests: number
  format: string
  latencyGt1100: number
  latencyLe5: number
  latencyLe10: number
  latencyLe20: number
  latencyLe35: number
  latencyLe55: number
  latencyLe80: number
  latencyLe120: number
  latencyLe180: number
  latencyLe260: number
  latencyLe380: number
  latencyLe540: number
  latencyLe800: number
  latencyLe1100: number
  latencyMsSum: number
  optimizedRequests: number
  path: string
  projectId: string
  requests: number
  sourceHost: string
  status: number
}

export function rollupRangeMeta(range: AnalyticsRange): RangeMeta {
  switch (range) {
    case '7d':
      return {
        n: 7,
        ms: DAY,
        label: (d) => dayjs(d).format('ddd'),
      }
    case '30d':
      return {
        n: 30,
        ms: DAY,
        label: (d) => dayjs(d).format('M/D'),
      }
    case '90d':
      return { n: 12, ms: 7 * DAY, label: (_d, i) => `W${i + 1}` }
    default:
      return {
        n: 24,
        ms: HOUR,
        label: (d) => dayjs(d).format('HH:00'),
      }
  }
}

export function rollupSinceFor(range: AnalyticsRange) {
  const { n, ms } = rollupRangeMeta(range)
  return dayjs()
    .subtract(n * ms, 'millisecond')
    .toDate()
}

function latencyIncrements(latencyMs: number) {
  const active = latencyBucketField(latencyMs)
  return Object.fromEntries(
    LATENCY_BUCKETS.map((b) => [b.field, b.field === active ? 1 : 0]),
  )
}

export async function updateAnalyticsRollupForLog(
  tx: Prisma.TransactionClient,
  log: NewRequestLog & { ts: Date },
) {
  const sourceHost = log.sourceHost ?? ''
  const bucket = latencyIncrements(log.latencyMs)
  await tx.$executeRaw`
    INSERT INTO "AnalyticsRollupHourly" (
      "id",
      "bucketStart",
      "orgId",
      "projectId",
      "sourceHost",
      "path",
      "format",
      "status",
      "requests",
      "cachedRequests",
      "optimizedRequests",
      "bytesIn",
      "bytesOut",
      "bytesSaved",
      "latencyMsSum",
      "latencyLe5",
      "latencyLe10",
      "latencyLe20",
      "latencyLe35",
      "latencyLe55",
      "latencyLe80",
      "latencyLe120",
      "latencyLe180",
      "latencyLe260",
      "latencyLe380",
      "latencyLe540",
      "latencyLe800",
      "latencyLe1100",
      "latencyGt1100",
      "updatedAt"
    )
    VALUES (
      md5(concat_ws('|',
        date_trunc('hour', ${log.ts}::timestamp)::text,
        ${log.orgId}::text,
        ${log.projectId}::text,
        ${sourceHost}::text,
        ${log.path}::text,
        ${log.format}::text,
        ${log.status}::text
      )),
      date_trunc('hour', ${log.ts}::timestamp),
      ${log.orgId},
      ${log.projectId},
      ${sourceHost},
      ${log.path},
      ${log.format},
      ${log.status},
      1,
      ${log.cached ? 1 : 0},
      ${log.cached ? 0 : 1},
      ${log.bytesIn},
      ${log.bytesOut},
      ${log.bytesSaved},
      ${log.latencyMs},
      ${bucket.latencyLe5},
      ${bucket.latencyLe10},
      ${bucket.latencyLe20},
      ${bucket.latencyLe35},
      ${bucket.latencyLe55},
      ${bucket.latencyLe80},
      ${bucket.latencyLe120},
      ${bucket.latencyLe180},
      ${bucket.latencyLe260},
      ${bucket.latencyLe380},
      ${bucket.latencyLe540},
      ${bucket.latencyLe800},
      ${bucket.latencyLe1100},
      ${bucket.latencyGt1100},
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("id") DO UPDATE SET
      "requests" = "AnalyticsRollupHourly"."requests" + 1,
      "cachedRequests" = "AnalyticsRollupHourly"."cachedRequests" + ${log.cached ? 1 : 0},
      "optimizedRequests" = "AnalyticsRollupHourly"."optimizedRequests" + ${log.cached ? 0 : 1},
      "bytesIn" = "AnalyticsRollupHourly"."bytesIn" + ${log.bytesIn},
      "bytesOut" = "AnalyticsRollupHourly"."bytesOut" + ${log.bytesOut},
      "bytesSaved" = "AnalyticsRollupHourly"."bytesSaved" + ${log.bytesSaved},
      "latencyMsSum" = "AnalyticsRollupHourly"."latencyMsSum" + ${log.latencyMs},
      "latencyLe5" = "AnalyticsRollupHourly"."latencyLe5" + ${bucket.latencyLe5},
      "latencyLe10" = "AnalyticsRollupHourly"."latencyLe10" + ${bucket.latencyLe10},
      "latencyLe20" = "AnalyticsRollupHourly"."latencyLe20" + ${bucket.latencyLe20},
      "latencyLe35" = "AnalyticsRollupHourly"."latencyLe35" + ${bucket.latencyLe35},
      "latencyLe55" = "AnalyticsRollupHourly"."latencyLe55" + ${bucket.latencyLe55},
      "latencyLe80" = "AnalyticsRollupHourly"."latencyLe80" + ${bucket.latencyLe80},
      "latencyLe120" = "AnalyticsRollupHourly"."latencyLe120" + ${bucket.latencyLe120},
      "latencyLe180" = "AnalyticsRollupHourly"."latencyLe180" + ${bucket.latencyLe180},
      "latencyLe260" = "AnalyticsRollupHourly"."latencyLe260" + ${bucket.latencyLe260},
      "latencyLe380" = "AnalyticsRollupHourly"."latencyLe380" + ${bucket.latencyLe380},
      "latencyLe540" = "AnalyticsRollupHourly"."latencyLe540" + ${bucket.latencyLe540},
      "latencyLe800" = "AnalyticsRollupHourly"."latencyLe800" + ${bucket.latencyLe800},
      "latencyLe1100" = "AnalyticsRollupHourly"."latencyLe1100" + ${bucket.latencyLe1100},
      "latencyGt1100" = "AnalyticsRollupHourly"."latencyGt1100" + ${bucket.latencyGt1100},
      "updatedAt" = CURRENT_TIMESTAMP
  `
}

function filterWhere(filters?: AnalyticsFilters) {
  const where: {
    format?: { in: string[] }
    sourceHost?: { in: string[] }
    status?: { in: number[] }
  } = {}
  if (filters?.format && filters.format.length > 0) {
    where.format = { in: filters.format }
  }
  if (filters?.domain && filters.domain.length > 0) {
    where.sourceHost = { in: filters.domain }
  }
  if (filters?.status && filters.status.length > 0) {
    const codes = filters.status.map(Number).filter((n) => !Number.isNaN(n))
    if (codes.length > 0) {
      where.status = { in: codes }
    }
  }
  return where
}

export function listAnalyticsRollups(
  tx: Prisma.TransactionClient,
  opts: {
    filters?: AnalyticsFilters
    gte: Date
    lt?: Date
    projectId?: string
  },
) {
  return tx.analyticsRollupHourly.findMany({
    where: {
      ...filterWhere(opts.filters),
      ...(opts.projectId ? { projectId: opts.projectId } : {}),
      bucketStart: opts.lt ? { gte: opts.gte, lt: opts.lt } : { gte: opts.gte },
    },
    select: {
      bucketStart: true,
      bytesIn: true,
      bytesOut: true,
      bytesSaved: true,
      cachedRequests: true,
      format: true,
      latencyGt1100: true,
      latencyLe5: true,
      latencyLe10: true,
      latencyLe20: true,
      latencyLe35: true,
      latencyLe55: true,
      latencyLe80: true,
      latencyLe120: true,
      latencyLe180: true,
      latencyLe260: true,
      latencyLe380: true,
      latencyLe540: true,
      latencyLe800: true,
      latencyLe1100: true,
      latencyMsSum: true,
      optimizedRequests: true,
      path: true,
      projectId: true,
      requests: true,
      sourceHost: true,
      status: true,
    },
  })
}

export function summarizeRollups(rows: RollupRow[]) {
  const counts: LatencyBucketCounts = emptyLatencyBucketCounts()
  let totalRequests = 0
  let cachedRequests = 0
  let bandwidthIn = 0
  let bandwidthOut = 0
  let bandwidthSaved = 0
  let latencyMsSum = 0
  for (const row of rows) {
    totalRequests += row.requests
    cachedRequests += row.cachedRequests
    bandwidthIn += Number(row.bytesIn)
    bandwidthOut += Number(row.bytesOut)
    bandwidthSaved += Number(row.bytesSaved)
    latencyMsSum += row.latencyMsSum
    for (const b of LATENCY_BUCKETS) {
      counts[b.field] += row[b.field]
    }
  }
  return {
    totalRequests,
    bandwidthIn,
    bandwidthOut,
    // Real optimizer savings summed per request — always ≥ 0, unlike the old
    // bandwidthIn − bandwidthOut, which went negative once cache hits (bytesIn
    // 0, bytesOut > 0) dominated the window.
    bandwidthSaved,
    hitRate: totalRequests === 0 ? 0 : (cachedRequests / totalRequests) * 100,
    // How much smaller every delivery was than the origin original it replaced:
    // saved / (saved + served). Booked on hits too, so the denominator is the
    // original-equivalent bytes (served + saved), not just origin fetches.
    savingsPct:
      bandwidthSaved + bandwidthOut === 0
        ? 0
        : (bandwidthSaved / (bandwidthSaved + bandwidthOut)) * 100,
    avg: totalRequests === 0 ? 0 : Math.round(latencyMsSum / totalRequests),
    p50: approximateLatencyPercentile(counts, 0.5),
    p75: approximateLatencyPercentile(counts, 0.75),
    p90: approximateLatencyPercentile(counts, 0.9),
    p95: approximateLatencyPercentile(counts, 0.95),
    p99: approximateLatencyPercentile(counts, 0.99),
  }
}

export function rollupsToTimeSeries(rows: RollupRow[], range: AnalyticsRange) {
  const meta = rollupRangeMeta(range)
  const sinceMs = dayjs()
    .subtract(meta.n * meta.ms, 'millisecond')
    .valueOf()
  const buckets: TimePoint[] = Array.from({ length: meta.n }, (_, i) => {
    const start = dayjs(sinceMs)
      .add(i * meta.ms, 'millisecond')
      .toDate()
    return {
      label: meta.label(start, i),
      requests: 0,
      cached: 0,
      optimized: 0,
      bandwidthIn: 0,
      bandwidthOut: 0,
    }
  })
  for (const row of rows) {
    const idx = Math.min(
      meta.n - 1,
      Math.max(0, Math.floor((row.bucketStart.getTime() - sinceMs) / meta.ms)),
    )
    const bucket = buckets[idx]
    bucket.requests += row.requests
    bucket.cached += row.cachedRequests
    bucket.optimized += row.optimizedRequests
    bucket.bandwidthIn += Number(row.bytesIn)
    bucket.bandwidthOut += Number(row.bytesOut)
  }
  return buckets
}

export function rollupsToLatencyBins(rows: RollupRow[]): LatencyBin[] {
  return LATENCY_BUCKETS.map((b) => ({
    bucket: b.max,
    label: b.label,
    value: rows.reduce((sum, row) => sum + row[b.field], 0),
  }))
}
