import cuid from 'cuid'
import {
  drainAnalyticsOutboxBatch,
  persistAnalyticsOutboxEvent,
} from '@/data-access/analytics-outbox'
import {
  aggregateRollupIncrements,
  applyRollupIncrement,
} from '@/data-access/analytics-rollups'
import type { NewRequestLog, RequestLogEvent } from '@/data-access/request-logs'
import { prisma } from '@/db'
import { recordRequestEvents } from '@/lib/clickhouse/events'
import { errorContext, logger } from '@/lib/logger/logger'
import { isCloud } from '@/server/deployment'

// Analytics writer for the public /img hot path. Self-hosted request logs are
// buffered; successful managed deliveries first commit a lightweight durable
// outbox row before the response leaves the action. A background transaction
// then batches those rows into RequestLog and hourly rollups. The previous design
// ran a Postgres transaction (RequestLog insert + a CONTENDED rollup upsert) per
// request — an unauthenticated contended-row load and throughput ceiling. Both
// paths now batch rollup writes: one createMany plus one upsert per distinct
// bucket. Self-host logs lag up to ~2s. Managed 2xx responses fail closed only
// when their cheap outbox insert cannot be persisted; a process exit cannot
// erase already-acknowledged billable bytes.

const MAX_BUFFER = 500
const FLUSH_INTERVAL_MS = 2000
const MAX_DURABLE_DRAIN_BATCHES = 200

export type BufferedRequestLog = RequestLogEvent

let buffer: BufferedRequestLog[] = []
let timer: NodeJS.Timeout | null = null
let flushing: Promise<void> | null = null
let durableTimer: NodeJS.Timeout | null = null
let durableFlushing: Promise<void> | null = null

async function persistManagedDelivery(event: RequestLogEvent) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await persistAnalyticsOutboxEvent(event)
      if (!durableTimer) {
        const t = setTimeout(() => {
          durableTimer = null
          flushDurableRequestLogs().catch((error) => {
            logger.error(errorContext(error), 'analytics outbox flush failed')
          })
        }, FLUSH_INTERVAL_MS)
        t.unref?.()
        durableTimer = t
      }
      return
    } catch (error) {
      if (attempt === 3) {
        throw error
      }
      logger.warn(
        { ...errorContext(error), attempt },
        'analytics outbox insert failed; retrying',
      )
      await new Promise((resolve) =>
        setTimeout(resolve, attempt === 1 ? 100 : 500),
      )
    }
  }
}

export function enqueueRequestLog(log: NewRequestLog) {
  const event = { ...log, id: cuid(), ts: new Date() }
  if (isCloud() && log.status >= 200 && log.status < 300) {
    return persistManagedDelivery(event)
  }
  buffer.push(event)
  if (buffer.length >= MAX_BUFFER) {
    // Fire-and-forget: flushRequestLogs never rejects (it logs and drops).
    flushRequestLogs()
    return Promise.resolve()
  }
  if (!timer) {
    const t = setTimeout(() => {
      timer = null
      flushRequestLogs()
    }, FLUSH_INTERVAL_MS)
    t.unref?.()
    timer = t
  }
  return Promise.resolve()
}

// Moves durable managed events into request logs and rollups under a global DB
// lock. The billing cron awaits this before reading complete-hour totals. A
// bounded drain prevents continuous traffic from monopolizing one process.
export function flushDurableRequestLogs(input?: {
  requireComplete?: boolean
  through?: Date
}): Promise<void> {
  if (durableFlushing) {
    // A billing caller cannot inherit the weaker guarantee of a background
    // drain that may legitimately return while another replica is busy. Join
    // it, then start a fresh cutoff-complete pass.
    return input?.requireComplete
      ? durableFlushing.then(() => flushDurableRequestLogs(input))
      : durableFlushing
  }
  const through = input?.through ?? new Date()
  durableFlushing = (async () => {
    for (
      let batchNumber = 0;
      batchNumber < MAX_DURABLE_DRAIN_BATCHES;
      batchNumber += 1
    ) {
      const result = await drainAnalyticsOutboxBatch(through)
      if (result.status === 'busy') {
        if (input?.requireComplete) {
          throw new Error('Analytics outbox is being drained by another job.')
        }
        return
      }
      if (result.status === 'empty') {
        return
      }
      recordRequestEvents(result.events)
      if (result.remaining === 0) {
        return
      }
    }
    throw new Error('Analytics outbox backlog exceeds the bounded drain limit.')
  })().finally(() => {
    durableFlushing = null
  })
  return durableFlushing
}

async function writeBatch(batch: BufferedRequestLog[]): Promise<void> {
  const increments = aggregateRollupIncrements(batch)
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await prisma.$transaction(
        async (db) => {
          await db.requestLog.createMany({
            data: batch.map((log) => ({
              id: log.id,
              ts: log.ts,
              orgId: log.orgId,
              projectId: log.projectId,
              path: log.path,
              width: log.width ?? null,
              quality: log.quality ?? null,
              format: log.format,
              status: log.status,
              cached: log.cached,
              latencyMs: log.latencyMs,
              bytesIn: log.bytesIn,
              bytesOut: log.bytesOut,
              bytesSaved: log.bytesSaved,
              region: log.region ?? null,
              country: log.country ?? null,
              sourceHost: log.sourceHost ?? null,
            })),
          })
          for (const increment of increments) {
            await applyRollupIncrement(db, increment)
          }
        },
        { timeout: 15_000 },
      )
      break
    } catch (error) {
      if (attempt === 3) {
        throw error
      }
      logger.warn(
        { ...errorContext(error), attempt, rows: batch.length },
        'analytics flush failed; retrying',
      )
      await new Promise((resolve) =>
        setTimeout(resolve, attempt === 1 ? 100 : 500),
      )
    }
  }
  // Mirrors into ClickHouse only after Postgres committed, same as before.
  recordRequestEvents(batch)
}

// Flush the current buffer. Single-flight: a flush already in progress absorbs
// the wait; anything enqueued meanwhile goes out with the NEXT flush. The
// completion handler drains that next batch immediately, because its timer may
// already have fired while the first (potentially retried) transaction ran.
export function flushRequestLogs(): Promise<void> {
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
    timer = null
  }
  flushing = writeBatch(batch)
    .catch((error) => {
      logger.error(
        { ...errorContext(error), dropped: batch.length },
        'analytics flush failed — batch dropped',
      )
    })
    .finally(() => {
      flushing = null
      if (buffer.length > 0) {
        flushRequestLogs()
      }
    })
  return flushing
}
