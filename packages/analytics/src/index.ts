import {
  ensureClickhouseSchemaReady,
  getClickhouseClient,
} from '@keenpix/clickhouse'
import { prisma } from '@keenpix/database'
import { createLogger } from '@keenpix/logger'
import cuid from 'cuid'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

export interface RequestEvent {
  bytesIn: number
  bytesOut: number
  bytesSaved: number
  cached: boolean
  country?: string
  format: string
  latencyMs: number
  orgId: string
  path: string
  projectId: string
  quality?: number
  region?: string
  sourceHost?: string
  status: number
  width?: number
}

const LATENCY_BUCKETS = [
  ['latencyLe5', 5],
  ['latencyLe10', 10],
  ['latencyLe20', 20],
  ['latencyLe35', 35],
  ['latencyLe55', 55],
  ['latencyLe80', 80],
  ['latencyLe120', 120],
  ['latencyLe180', 180],
  ['latencyLe260', 260],
  ['latencyLe380', 380],
  ['latencyLe540', 540],
  ['latencyLe800', 800],
  ['latencyLe1100', 1100],
] as const

type BufferedRequestEvent = RequestEvent & { id: string; ts: Date }

export function createRequestEventBuffer(options: {
  flushIntervalMs?: number
  logger?: ReturnType<typeof createLogger>
  maxBuffer?: number
}) {
  const logger = options.logger ?? createLogger()
  const maxBuffer = options.maxBuffer ?? 500
  const flushIntervalMs = options.flushIntervalMs ?? 2000
  let buffer: BufferedRequestEvent[] = []
  let timer: NodeJS.Timeout | undefined
  let flushing: Promise<void> | undefined

  async function writeBatch(batch: BufferedRequestEvent[]) {
    const groups = new Map<string, ReturnType<typeof createIncrement>>()
    for (const event of batch) {
      const bucketStart = dayjs(event.ts).utc().startOf('hour').toDate()
      const key = [
        bucketStart.toISOString(),
        event.orgId,
        event.projectId,
        event.sourceHost ?? '',
        event.country ?? '',
        event.path,
        event.format,
        event.status,
      ].join('\0')
      const increment = groups.get(key) ?? createIncrement(event, bucketStart)
      increment.requests += 1
      increment.cachedRequests +=
        event.status >= 200 && event.status < 300 && event.cached ? 1 : 0
      increment.optimizedRequests +=
        event.status >= 200 && event.status < 300 && !event.cached ? 1 : 0
      increment.bytesIn += event.bytesIn
      increment.bytesOut += event.bytesOut
      increment.bytesSaved += event.bytesSaved
      increment.latencyMsSum += event.latencyMs
      const field =
        LATENCY_BUCKETS.find(([, max]) => event.latencyMs <= max)?.[0] ??
        'latencyGt1100'
      increment.latency[field] += 1
      groups.set(key, increment)
    }

    await prisma.$transaction(
      async (db) => {
        await db.requestLog.createMany({
          data: batch.map((event) => ({
            ...event,
            country: event.country ?? null,
            quality: event.quality ?? null,
            region: event.region ?? null,
            sourceHost: event.sourceHost ?? null,
            width: event.width ?? null,
          })),
        })
        for (const increment of groups.values()) {
          const latency = increment.latency
          await db.$executeRaw`
            INSERT INTO "AnalyticsRollupHourly" (
              "id", "bucketStart", "orgId", "projectId", "sourceHost",
              "country", "path", "format", "status", "requests",
              "cachedRequests", "optimizedRequests", "bytesIn", "bytesOut",
              "bytesSaved", "latencyMsSum", "latencyLe5", "latencyLe10",
              "latencyLe20", "latencyLe35", "latencyLe55", "latencyLe80",
              "latencyLe120", "latencyLe180", "latencyLe260", "latencyLe380",
              "latencyLe540", "latencyLe800", "latencyLe1100",
              "latencyGt1100", "updatedAt"
            ) VALUES (
              ${cuid()}, ${increment.bucketStart}, ${increment.orgId},
              ${increment.projectId}, ${increment.sourceHost},
              ${increment.country}, ${increment.path}, ${increment.format},
              ${increment.status}, ${increment.requests},
              ${increment.cachedRequests}, ${increment.optimizedRequests},
              ${increment.bytesIn}, ${increment.bytesOut}, ${increment.bytesSaved},
              ${increment.latencyMsSum}, ${latency.latencyLe5},
              ${latency.latencyLe10}, ${latency.latencyLe20},
              ${latency.latencyLe35}, ${latency.latencyLe55},
              ${latency.latencyLe80}, ${latency.latencyLe120},
              ${latency.latencyLe180}, ${latency.latencyLe260},
              ${latency.latencyLe380}, ${latency.latencyLe540},
              ${latency.latencyLe800}, ${latency.latencyLe1100},
              ${latency.latencyGt1100}, CURRENT_TIMESTAMP
            )
            ON CONFLICT ("bucketStart", "orgId", "projectId", "sourceHost", "country", "path", "format", "status") DO UPDATE SET
              "requests" = "AnalyticsRollupHourly"."requests" + ${increment.requests},
              "cachedRequests" = "AnalyticsRollupHourly"."cachedRequests" + ${increment.cachedRequests},
              "optimizedRequests" = "AnalyticsRollupHourly"."optimizedRequests" + ${increment.optimizedRequests},
              "bytesIn" = "AnalyticsRollupHourly"."bytesIn" + ${increment.bytesIn},
              "bytesOut" = "AnalyticsRollupHourly"."bytesOut" + ${increment.bytesOut},
              "bytesSaved" = "AnalyticsRollupHourly"."bytesSaved" + ${increment.bytesSaved},
              "latencyMsSum" = "AnalyticsRollupHourly"."latencyMsSum" + ${increment.latencyMsSum},
              "latencyLe5" = "AnalyticsRollupHourly"."latencyLe5" + ${latency.latencyLe5},
              "latencyLe10" = "AnalyticsRollupHourly"."latencyLe10" + ${latency.latencyLe10},
              "latencyLe20" = "AnalyticsRollupHourly"."latencyLe20" + ${latency.latencyLe20},
              "latencyLe35" = "AnalyticsRollupHourly"."latencyLe35" + ${latency.latencyLe35},
              "latencyLe55" = "AnalyticsRollupHourly"."latencyLe55" + ${latency.latencyLe55},
              "latencyLe80" = "AnalyticsRollupHourly"."latencyLe80" + ${latency.latencyLe80},
              "latencyLe120" = "AnalyticsRollupHourly"."latencyLe120" + ${latency.latencyLe120},
              "latencyLe180" = "AnalyticsRollupHourly"."latencyLe180" + ${latency.latencyLe180},
              "latencyLe260" = "AnalyticsRollupHourly"."latencyLe260" + ${latency.latencyLe260},
              "latencyLe380" = "AnalyticsRollupHourly"."latencyLe380" + ${latency.latencyLe380},
              "latencyLe540" = "AnalyticsRollupHourly"."latencyLe540" + ${latency.latencyLe540},
              "latencyLe800" = "AnalyticsRollupHourly"."latencyLe800" + ${latency.latencyLe800},
              "latencyLe1100" = "AnalyticsRollupHourly"."latencyLe1100" + ${latency.latencyLe1100},
              "latencyGt1100" = "AnalyticsRollupHourly"."latencyGt1100" + ${latency.latencyGt1100},
              "updatedAt" = CURRENT_TIMESTAMP
          `
        }
      },
      { timeout: 15_000 },
    )

    const client = getClickhouseClient()
    if (client) {
      await ensureClickhouseSchemaReady()
      await client.insert({
        table: 'request_events',
        format: 'JSONEachRow',
        values: batch.map((event) => ({
          bytes_in: event.bytesIn,
          bytes_out: event.bytesOut,
          bytes_saved: event.bytesSaved,
          cached: event.cached ? 1 : 0,
          country: event.country ?? '',
          format: event.format,
          id: event.id,
          latency_ms: event.latencyMs,
          org_id: event.orgId,
          path: event.path,
          project_id: event.projectId,
          quality: event.quality ?? 0,
          region: event.region ?? '',
          source_host: event.sourceHost ?? '',
          status: event.status,
          ts: dayjs(event.ts).utc().format('YYYY-MM-DD HH:mm:ss.SSS'),
          width: event.width ?? 0,
        })),
      })
    }
  }

  function flush(): Promise<void> {
    if (flushing) {
      return flushing
    }
    if (buffer.length === 0) {
      return Promise.resolve()
    }
    const batch = buffer
    buffer = []
    if (timer) {
      clearTimeout(timer)
      timer = undefined
    }
    flushing = writeBatch(batch)
      .catch((error) =>
        logger.error(
          { error, dropped: batch.length },
          'analytics flush failed',
        ),
      )
      .finally(() => {
        flushing = undefined
        if (buffer.length > 0) {
          flush()
        }
      })
    return flushing
  }

  return {
    enqueue(event: RequestEvent) {
      buffer.push({ ...event, id: cuid(), ts: new Date() })
      if (buffer.length >= maxBuffer) {
        flush()
      } else if (!timer) {
        timer = setTimeout(() => {
          timer = undefined
          flush()
        }, flushIntervalMs)
        timer.unref?.()
      }
    },
    flush,
  }
}

function createIncrement(event: BufferedRequestEvent, bucketStart: Date) {
  return {
    bucketStart,
    bytesIn: 0,
    bytesOut: 0,
    bytesSaved: 0,
    cachedRequests: 0,
    country: event.country ?? '',
    format: event.format,
    latency: {
      latencyLe5: 0,
      latencyLe10: 0,
      latencyLe20: 0,
      latencyLe35: 0,
      latencyLe55: 0,
      latencyLe80: 0,
      latencyLe120: 0,
      latencyLe180: 0,
      latencyLe260: 0,
      latencyLe380: 0,
      latencyLe540: 0,
      latencyLe800: 0,
      latencyLe1100: 0,
      latencyGt1100: 0,
    },
    latencyMsSum: 0,
    optimizedRequests: 0,
    orgId: event.orgId,
    path: event.path,
    projectId: event.projectId,
    requests: 0,
    sourceHost: event.sourceHost ?? '',
    status: event.status,
  }
}
