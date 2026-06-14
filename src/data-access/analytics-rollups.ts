import dayjs from 'dayjs'
import type { Prisma } from '@/generated/prisma/client'
import {
  LATENCY_BUCKETS,
  latencyBucketField,
} from '@/helpers/analytics/latency-buckets'
import type { AnalyticsRange } from '@/shared/types'
import type { NewRequestLog } from './request-logs'

const DAY = 86_400_000
const HOUR = 3_600_000

interface RangeMeta {
  label: (date: Date, index: number) => string
  ms: number
  n: number
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
  const country = log.country ?? ''
  const bucket = latencyIncrements(log.latencyMs)
  await tx.$executeRaw`
    INSERT INTO "AnalyticsRollupHourly" (
      "id",
      "bucketStart",
      "orgId",
      "projectId",
      "sourceHost",
      "country",
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
        ${country}::text,
        ${log.path}::text,
        ${log.format}::text,
        ${log.status}::text
      )),
      date_trunc('hour', ${log.ts}::timestamp),
      ${log.orgId},
      ${log.projectId},
      ${sourceHost},
      ${country},
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

// Shared bucketing for every over-time chart: n evenly-spaced buckets ending
// now, a label per bucket, and the bucket a rollup row falls into (clamped to
// the visible window).
export function rollupBucketing(range: AnalyticsRange) {
  const meta = rollupRangeMeta(range)
  const sinceMs = dayjs()
    .subtract(meta.n * meta.ms, 'millisecond')
    .valueOf()
  return {
    n: meta.n,
    labelFor: (i: number) =>
      meta.label(
        dayjs(sinceMs)
          .add(i * meta.ms, 'millisecond')
          .toDate(),
        i,
      ),
    indexFor: (bucketStart: Date) =>
      Math.min(
        meta.n - 1,
        Math.max(0, Math.floor((bucketStart.getTime() - sinceMs) / meta.ms)),
      ),
  }
}
