import cuid from 'cuid'
import dayjs from 'dayjs'
import type { Prisma } from '@/generated/prisma/client'
import {
  LATENCY_BUCKETS,
  latencyBucketField,
} from '@/helpers/analytics/latency-buckets'
import type { AnalyticsRange, HistoricalAnalyticsRange } from '@/shared/types'
import type { NewRequestLog } from './request-logs'

const DAY = 86_400_000
const HOUR = 3_600_000

export interface RollupBucketing {
  gte: Date
  indexFor: (bucketStart: Date) => number
  labelFor: (index: number) => string
  lt: Date
  n: number
  startFor: (index: number) => string
}

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

export function historicalRollupBucketing(
  input: {
    coverageStart?: Date | null
    from?: string
    range: HistoricalAnalyticsRange
    to?: string
  },
  now = dayjs(),
): RollupBucketing {
  let gte: dayjs.Dayjs
  let lt: dayjs.Dayjs
  if (input.range === 'custom') {
    gte = input.from
      ? dayjs(`${input.from}T00:00:00.000Z`)
      : now.subtract(30, 'day')
    lt = input.to ? dayjs(`${input.to}T00:00:00.000Z`).add(1, 'day') : now
  } else if (input.range === 'all') {
    gte = input.coverageStart
      ? dayjs(input.coverageStart).startOf('hour')
      : now.startOf('hour')
    lt = now.add(1, 'millisecond')
  } else if (input.range === '365d') {
    gte = now.startOf('day').subtract(364, 'day')
    lt = now.add(1, 'millisecond')
  } else if (input.range === '90d') {
    gte = now.startOf('day').subtract(89, 'day')
    lt = now.add(1, 'millisecond')
  } else if (input.range === '30d') {
    gte = now.startOf('day').subtract(29, 'day')
    lt = now.add(1, 'millisecond')
  } else if (input.range === '7d') {
    gte = now.startOf('day').subtract(6, 'day')
    lt = now.add(1, 'millisecond')
  } else {
    gte = now.startOf('hour').subtract(23, 'hour')
    lt = now.add(1, 'millisecond')
  }

  const span = Math.max(HOUR, lt.diff(gte))
  let ms: number
  if (input.range === '24h') {
    ms = HOUR
  } else if (input.range === '7d' || input.range === '30d') {
    ms = DAY
  } else if (input.range === '90d' || input.range === '365d') {
    ms = 7 * DAY
  } else if (span <= 48 * HOUR) {
    ms = HOUR
  } else if (span <= 90 * DAY) {
    ms = DAY
  } else if (span <= 730 * DAY) {
    ms = 7 * DAY
  } else {
    ms = Math.max(30 * DAY, Math.ceil(span / (120 * DAY)) * DAY)
  }
  if (input.range === 'all' && ms >= DAY) {
    gte = gte.startOf('day')
  }
  const alignedSpan = Math.max(HOUR, lt.diff(gte))
  const n = Math.max(1, Math.ceil(alignedSpan / ms))
  const sinceMs = gte.valueOf()
  const labelFor = (index: number) => {
    const date = dayjs(sinceMs + index * ms)
    if (ms <= HOUR) {
      return date.format(span > DAY ? 'MMM D HH:mm' : 'HH:00')
    }
    if (ms <= DAY) {
      return date.format('MMM D')
    }
    if (ms <= 14 * DAY) {
      return date.format('MMM D')
    }
    return date.format('MMM YYYY')
  }
  return {
    gte: gte.toDate(),
    lt: lt.toDate(),
    n,
    labelFor,
    startFor: (index) => dayjs(sinceMs + index * ms).toISOString(),
    indexFor: (bucketStart) =>
      Math.min(
        n - 1,
        Math.max(0, Math.floor((bucketStart.getTime() - sinceMs) / ms)),
      ),
  }
}

// One aggregated upsert for a rollup bucket. Batched by the analytics buffer:
// N requests to the same (hour, org, project, host, country, path, format,
// status) collapse into ONE row-lock acquisition per flush instead of N — the
// old per-request upsert was both a throughput ceiling and an unauthenticated
// DB-load vector on the public /img path.
export interface RollupIncrement {
  bucketStart: Date
  bytesIn: number
  bytesOut: number
  bytesSaved: number
  cachedRequests: number
  country: string
  format: string
  latency: Record<string, number>
  latencyMsSum: number
  optimizedRequests: number
  orgId: string
  path: string
  projectId: string
  requests: number
  sourceHost: string
  status: number
}

function startOfHourUtc(ts: Date): Date {
  const bucket = new Date(ts)
  bucket.setUTCMinutes(0, 0, 0)
  return bucket
}

// Pure grouping (unit-tested): a flush batch → one increment per distinct
// rollup bucket, with all counters pre-summed.
export function aggregateRollupIncrements(
  rows: Array<NewRequestLog & { ts: Date }>,
): RollupIncrement[] {
  const groups = new Map<string, RollupIncrement>()
  for (const log of rows) {
    const bucketStart = startOfHourUtc(log.ts)
    const sourceHost = log.sourceHost ?? ''
    const country = log.country ?? ''
    const key = [
      bucketStart.toISOString(),
      log.orgId,
      log.projectId,
      sourceHost,
      country,
      log.path,
      log.format,
      log.status,
    ].join('\\0')
    let inc = groups.get(key)
    if (!inc) {
      inc = {
        bucketStart,
        orgId: log.orgId,
        projectId: log.projectId,
        sourceHost,
        country,
        path: log.path,
        format: log.format,
        status: log.status,
        requests: 0,
        cachedRequests: 0,
        optimizedRequests: 0,
        bytesIn: 0,
        bytesOut: 0,
        bytesSaved: 0,
        latencyMsSum: 0,
        latency: Object.fromEntries(LATENCY_BUCKETS.map((b) => [b.field, 0])),
      }
      groups.set(key, inc)
    }
    inc.requests += 1
    const delivered = log.status >= 200 && log.status < 300
    inc.cachedRequests += delivered && log.cached ? 1 : 0
    inc.optimizedRequests += delivered && !log.cached ? 1 : 0
    inc.bytesIn += log.bytesIn
    inc.bytesOut += log.bytesOut
    inc.bytesSaved += log.bytesSaved
    inc.latencyMsSum += log.latencyMs
    inc.latency[latencyBucketField(log.latencyMs)] += 1
  }
  return [...groups.values()]
}

export async function applyRollupIncrement(
  db: Prisma.TransactionClient,
  inc: RollupIncrement,
) {
  const bucket = inc.latency
  await db.$executeRaw`
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
      ${cuid()},
      ${inc.bucketStart},
      ${inc.orgId},
      ${inc.projectId},
      ${inc.sourceHost},
      ${inc.country},
      ${inc.path},
      ${inc.format},
      ${inc.status},
      ${inc.requests},
      ${inc.cachedRequests},
      ${inc.optimizedRequests},
      ${inc.bytesIn},
      ${inc.bytesOut},
      ${inc.bytesSaved},
      ${inc.latencyMsSum},
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
    ON CONFLICT ("bucketStart", "orgId", "projectId", "sourceHost", "country", "path", "format", "status") DO UPDATE SET
      "requests" = "AnalyticsRollupHourly"."requests" + ${inc.requests},
      "cachedRequests" = "AnalyticsRollupHourly"."cachedRequests" + ${inc.cachedRequests},
      "optimizedRequests" = "AnalyticsRollupHourly"."optimizedRequests" + ${inc.optimizedRequests},
      "bytesIn" = "AnalyticsRollupHourly"."bytesIn" + ${inc.bytesIn},
      "bytesOut" = "AnalyticsRollupHourly"."bytesOut" + ${inc.bytesOut},
      "bytesSaved" = "AnalyticsRollupHourly"."bytesSaved" + ${inc.bytesSaved},
      "latencyMsSum" = "AnalyticsRollupHourly"."latencyMsSum" + ${inc.latencyMsSum},
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
    startFor: (i: number) => dayjs(sinceMs + i * meta.ms).toISOString(),
    indexFor: (bucketStart: Date) =>
      Math.min(
        meta.n - 1,
        Math.max(0, Math.floor((bucketStart.getTime() - sinceMs) / meta.ms)),
      ),
  }
}
