import { prisma } from '@keenpix/database'
import cuid from 'cuid'
import {
  aggregateRollupIncrements,
  applyRollupIncrement,
} from '@/data-access/analytics-rollups'
import type { NewRequestLog } from '@/data-access/request-logs'
import { recordRequestEvents } from '@/lib/clickhouse/events'
import { errorContext, logger } from '@/lib/logger/logger'

// Buffered analytics writer for the public /img hot path. The previous design
// ran a Postgres transaction (RequestLog insert + a CONTENDED rollup upsert) per
// request — an unauthenticated-DB-load vector and a throughput ceiling. Requests
// now enqueue in memory and a flusher writes batches: one createMany for the
// rows, one upsert per DISTINCT rollup bucket per flush (a thousand requests to
// the same image collapse into a single upsert), one ClickHouse batch insert.
// Analytics stays off the serving path. A flush is one atomic Postgres
// transaction, retried briefly for transient failures, so RequestLog and the
// hourly rollups cannot diverge. Logs/rollups lag up to ~2s, within the live-log
// poll interval; complete-hour billing reads those same rollups.

const MAX_BUFFER = 500
const FLUSH_INTERVAL_MS = 2000

export type BufferedRequestLog = NewRequestLog & { id: string; ts: Date }

let buffer: BufferedRequestLog[] = []
let timer: NodeJS.Timeout | null = null
let flushing: Promise<void> | null = null

export function enqueueRequestLog(log: NewRequestLog): void {
  buffer.push({ ...log, id: cuid(), ts: new Date() })
  if (buffer.length >= MAX_BUFFER) {
    // Fire-and-forget: flushRequestLogs never rejects (it logs and drops).
    flushRequestLogs()
    return
  }
  if (!timer) {
    const t = setTimeout(() => {
      timer = null
      flushRequestLogs()
    }, FLUSH_INTERVAL_MS)
    t.unref?.()
    timer = t
  }
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
