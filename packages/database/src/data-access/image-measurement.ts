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

// Accounting has already committed. Failure leaves this row for the next drain;
// each invocation processes at most one batch on the isolated measurement pool.
export async function drainImageMeasurementOutbox() {
  await measurementPrisma.$transaction(
    async (db) => {
      const rows = await db.$queryRaw<
        { id: string; candidates: Candidate[] }[]
      >`
      SELECT "id", "candidates" FROM "ImageMeasurementOutbox"
      ORDER BY "createdAt", "id" LIMIT 1 FOR UPDATE SKIP LOCKED`
      if (!rows[0]) {
        return
      }
      await recordProjectFirstImageSuccesses(rows[0].candidates, db)
      await db.$executeRaw`DELETE FROM "ImageMeasurementOutbox" WHERE "id" = ${rows[0].id}`
    },
    { maxWait: 500, timeout: 1500 },
  )
}
