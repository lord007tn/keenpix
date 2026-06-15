import 'dotenv/config'
import cuid from 'cuid'
import { prisma } from '../src/db'
import { Prisma } from '../src/generated/prisma/client'

// One-time backfill: rewrite existing ResourceRollupHourly / AnalyticsRollupHourly
// row ids (old ISO-timestamp / md5 keys) to cuids. Idempotent — it skips rows
// already in cuid2 form, so it is safe to run repeatedly. These ids are pure
// surrogate keys (no foreign key references them) and dedup is handled by the
// natural-key unique constraints, so rewriting them is cosmetic and never
// changes row counts. EdgeRollupHourly is Cloudflare data and is left untouched.

// cuid (v1) shape: 25 chars, leading "c", lowercase base36.
const CUID_PATTERN = '^c[0-9a-z]{24}$'
const BATCH = 1000

async function backfill(
  table: 'ResourceRollupHourly' | 'AnalyticsRollupHourly',
) {
  const quoted = Prisma.raw(`"${table}"`)
  let total = 0
  for (;;) {
    const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT "id" FROM ${quoted} WHERE "id" !~ ${CUID_PATTERN} LIMIT ${BATCH}
    `)
    if (rows.length === 0) {
      break
    }
    const pairs = rows.map((r) => Prisma.sql`(${r.id}, ${cuid()})`)
    await prisma.$executeRaw(Prisma.sql`
      UPDATE ${quoted} AS t
      SET "id" = v.newid
      FROM (VALUES ${Prisma.join(pairs)}) AS v(oldid, newid)
      WHERE t."id" = v.oldid
    `)
    total += rows.length
    console.log(`${table}: ${total} rows backfilled`)
    if (rows.length < BATCH) {
      break
    }
  }
  return total
}

async function main() {
  const resource = await backfill('ResourceRollupHourly')
  const analytics = await backfill('AnalyticsRollupHourly')
  console.log(
    `Backfill complete — Resource: ${resource}, Analytics: ${analytics}.`,
  )
  await prisma.$disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
