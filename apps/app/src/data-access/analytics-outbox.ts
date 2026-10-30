import { prisma } from '@keenpix/database'
import type { AnalyticsEventOutbox, Prisma } from '@keenpix/database/client'
import {
  aggregateRollupIncrements,
  applyRollupIncrement,
} from '@/data-access/analytics-rollups'
import type { RequestLogEvent } from '@/data-access/request-logs'
import { selectImageMeasurementCandidates } from '@/helpers/analytics/measurement-candidates'

const OUTBOX_BATCH_SIZE = 500
const OUTBOX_LOCK_CLASS = 0x6b_70
const OUTBOX_LOCK_OBJ = 2

export function persistAnalyticsOutboxEvent(
  event: RequestLogEvent,
  activationCandidate = false,
) {
  return prisma.analyticsEventOutbox.create({
    data: { ...event, activationCandidate },
  })
}

async function writeOutboxBatch(
  db: Prisma.TransactionClient,
  batch: AnalyticsEventOutbox[],
  appOrigin?: string,
) {
  const events = batch.map((log) => ({
    id: log.id,
    ts: log.ts,
    orgId: log.orgId,
    projectId: log.projectId,
    path: log.path,
    width: log.width ?? undefined,
    quality: log.quality ?? undefined,
    format: log.format,
    status: log.status,
    cached: log.cached,
    latencyMs: log.latencyMs,
    bytesIn: log.bytesIn,
    bytesOut: log.bytesOut,
    bytesSaved: log.bytesSaved,
    region: log.region ?? undefined,
    country: log.country ?? undefined,
    sourceHost: log.sourceHost ?? undefined,
  }))
  await db.requestLog.createMany({ data: events })
  for (const increment of aggregateRollupIncrements(events)) {
    await applyRollupIncrement(db, increment)
  }
  const candidates = selectImageMeasurementCandidates(batch, appOrigin)
  if (candidates.length > 0) {
    // A savepoint is required: catching a PostgreSQL error alone leaves the
    // accounting transaction aborted. Only optional handoff is rolled back.
    await db.$executeRaw`SAVEPOINT image_measurement`
    try {
      const [settings] = await db.$queryRaw<
        { statement: string; lock: string }[]
      >`
        SELECT current_setting('statement_timeout') AS statement, current_setting('lock_timeout') AS lock`
      await db.$executeRaw`SELECT set_config('statement_timeout', '750ms', true), set_config('lock_timeout', '150ms', true)`
      const [capacity] = await db.$queryRaw<{ available: boolean }[]>`
        SELECT pg_try_advisory_xact_lock(${OUTBOX_LOCK_CLASS}, 3)
          AND (SELECT COUNT(*) FROM "ImageMeasurementOutbox") < 1000 AS available`
      if (!capacity?.available) {
        throw new Error('Measurement queue capacity reached')
      }
      await db.$executeRaw`
        INSERT INTO "ImageMeasurementOutbox" ("id", "candidates")
        VALUES (${batch[0].id}, ${JSON.stringify(candidates)}::jsonb)
        ON CONFLICT DO NOTHING`
      await db.$executeRaw`SELECT set_config('statement_timeout', ${settings.statement}, true), set_config('lock_timeout', ${settings.lock}, true)`
      await db.$executeRaw`RELEASE SAVEPOINT image_measurement`
    } catch {
      await db.$executeRaw`ROLLBACK TO SAVEPOINT image_measurement`
      await db.$executeRaw`RELEASE SAVEPOINT image_measurement`
      await db.$executeRaw`SAVEPOINT image_measurement_gap`
      try {
        const [settings] = await db.$queryRaw<
          { statement: string; lock: string }[]
        >`
          SELECT current_setting('statement_timeout') AS statement, current_setting('lock_timeout') AS lock`
        await db.$executeRaw`SELECT set_config('statement_timeout', '750ms', true), set_config('lock_timeout', '150ms', true)`
        await db.$executeRaw`
          INSERT INTO "FirstExternalImageInterruption" ("startedAt", "endedAt")
          SELECT MIN("observedAt"), MAX("observedAt") + interval '1 millisecond'
          FROM jsonb_to_recordset(${JSON.stringify(candidates)}::jsonb) event("observedAt" timestamp)
          ON CONFLICT DO NOTHING`
        await db.$executeRaw`SELECT set_config('statement_timeout', ${settings.statement}, true), set_config('lock_timeout', ${settings.lock}, true)`
      } catch {
        // Missing migration/database failure also prevents gap persistence.
        // Positive coverage evidence is still required, so this cannot yield zero.
        await db.$executeRaw`ROLLBACK TO SAVEPOINT image_measurement_gap`
      }
      await db.$executeRaw`RELEASE SAVEPOINT image_measurement_gap`
    }
  }
  await db.analyticsEventOutbox.deleteMany({
    where: { id: { in: batch.map((event) => event.id) } },
  })
  return events
}

// Project deletion: both ledgers cascade with the project in this transaction,
// so no external observation is derived here.
export async function drainProjectAnalyticsOutbox(
  db: Prisma.TransactionClient,
  projectId: string,
) {
  const batch = await db.analyticsEventOutbox.findMany({
    where: { projectId },
  })
  return batch.length > 0 ? writeOutboxBatch(db, batch) : []
}

export function drainAnalyticsOutboxBatch(through: Date, appOrigin?: string) {
  return prisma.$transaction(
    async (db) => {
      const locks = await db.$queryRaw<{ locked: boolean }[]>`
        SELECT pg_try_advisory_xact_lock(${OUTBOX_LOCK_CLASS}, ${OUTBOX_LOCK_OBJ}) AS locked`
      if (!locks[0]?.locked) {
        return { status: 'busy' as const }
      }
      const batch = await db.analyticsEventOutbox.findMany({
        orderBy: { createdAt: 'asc' },
        take: OUTBOX_BATCH_SIZE,
        where: { ts: { lt: through } },
      })
      if (batch.length === 0) {
        return { status: 'empty' as const }
      }
      const events = await writeOutboxBatch(db, batch, appOrigin)
      const remaining = await db.analyticsEventOutbox.count({
        where: { ts: { lt: through } },
      })
      return { status: 'drained' as const, events, remaining }
    },
    { timeout: 30_000 },
  )
}
