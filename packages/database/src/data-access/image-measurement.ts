import { measurementPrisma } from '../index'
import { recordProjectFirstImageSuccesses } from './activation'

type Candidate = Parameters<typeof recordProjectFirstImageSuccesses>[0][number]

export function recordFirstExternalImageInterruption(input: {
  from: Date
  to: Date
}) {
  return measurementPrisma.$executeRaw`
    INSERT INTO "FirstExternalImageInterruption" ("startedAt", "endedAt")
    VALUES (${input.from}, ${input.to}) ON CONFLICT DO NOTHING`
}

// Claim attempts durably before capture: a failed SQL transaction must not reset
// the attempt count. A short lease prevents replicas retrying the same row at once.
export async function drainImageMeasurementOutbox() {
  const rows = await measurementPrisma.$queryRaw<
    {
      id: string
      candidates: Candidate[]
      attempts: number
      expired: boolean
    }[]
  >`
    WITH candidate AS (
      SELECT "id" FROM "ImageMeasurementOutbox"
      WHERE "nextAttemptAt" <= CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
      ORDER BY "nextAttemptAt", "createdAt", "id" LIMIT 1 FOR UPDATE SKIP LOCKED
    )
    UPDATE "ImageMeasurementOutbox" q SET "attempts" = q."attempts" + 1,
      "nextAttemptAt" = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + interval '5 seconds'
    FROM candidate WHERE q."id" = candidate."id"
    RETURNING q."id", q."candidates", q."attempts",
      q."createdAt" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - interval '24 hours' AS expired`
  const row = rows[0]
  if (!row) {
    return
  }
  if (row.expired || row.attempts > 5) {
    await retireImageMeasurementOutbox(row.id)
    return
  }
  try {
    await recordProjectFirstImageSuccesses(row.candidates, measurementPrisma)
    await measurementPrisma.$executeRaw`DELETE FROM "ImageMeasurementOutbox" WHERE "id" = ${row.id}`
  } catch (error) {
    if (row.attempts >= 5) {
      await retireImageMeasurementOutbox(row.id)
    }
    throw error
  }
}

// Retirement commits its loss record and deletion together, without querying a
// ledger table. Missing ledgers therefore cannot poison the queue indefinitely.
async function retireImageMeasurementOutbox(id: string) {
  await measurementPrisma.$transaction(
    async (db) => {
      await db.$executeRaw`
      INSERT INTO "FirstExternalImageInterruption" ("startedAt", "endedAt")
      SELECT MIN((event->>'observedAt')::timestamp),
        MAX((event->>'observedAt')::timestamp) + interval '1 millisecond'
      FROM "ImageMeasurementOutbox" q, LATERAL jsonb_array_elements(q."candidates") event
      WHERE q."id" = ${id}
      HAVING COUNT(*) > 0 ON CONFLICT DO NOTHING`
      await db.$executeRaw`DELETE FROM "ImageMeasurementOutbox" WHERE "id" = ${id}`
    },
    { maxWait: 500, timeout: 1500 },
  )
}
