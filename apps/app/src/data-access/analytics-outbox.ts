import { prisma } from '@keenpix/database'
import type { AnalyticsEventOutbox, Prisma } from '@keenpix/database/client'
import {
  aggregateRollupIncrements,
  applyRollupIncrement,
} from '@/data-access/analytics-rollups'
import type { RequestLogEvent } from '@/data-access/request-logs'

const OUTBOX_BATCH_SIZE = 500
const OUTBOX_LOCK_CLASS = 0x6b_70
const OUTBOX_LOCK_OBJ = 2

export function persistAnalyticsOutboxEvent(event: RequestLogEvent) {
  return prisma.analyticsEventOutbox.create({ data: event })
}

async function writeOutboxBatch(
  db: Prisma.TransactionClient,
  batch: AnalyticsEventOutbox[],
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
  await db.analyticsEventOutbox.deleteMany({
    where: { id: { in: batch.map((event) => event.id) } },
  })
  return events
}

export async function drainProjectAnalyticsOutbox(
  db: Prisma.TransactionClient,
  projectId: string,
) {
  const batch = await db.analyticsEventOutbox.findMany({
    where: { projectId },
  })
  return batch.length > 0 ? writeOutboxBatch(db, batch) : []
}

export function drainAnalyticsOutboxBatch(through: Date) {
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
      const events = await writeOutboxBatch(db, batch)
      const remaining = await db.analyticsEventOutbox.count({
        where: { ts: { lt: through } },
      })
      return { status: 'drained' as const, events, remaining }
    },
    { timeout: 30_000 },
  )
}
