import { createHash } from 'node:crypto'
import { prisma } from '@/db'
import { Prisma } from '@/generated/prisma/client'
import type { EdgeRollupRow } from '@/helpers/analytics/edge-rollups'
import type { EdgeAdaptiveGroup } from '@/lib/cloudflare/analytics'

// Stable id per (zone, host, hour, cacheStatus) so a re-capture of the same hour
// upserts in place (the adaptive dataset settles for a few minutes).
function rollupId(
  zoneId: string,
  host: string,
  bucketStart: Date,
  cacheStatus: string,
): string {
  return createHash('md5')
    .update(`${zoneId}|${host}|${bucketStart.toISOString()}|${cacheStatus}`)
    .digest('hex')
}

// Persist the captured adaptive groups; the latest capture overwrites count/bytes
// for any hour already stored.
export async function upsertEdgeRollups(
  zoneId: string,
  host: string,
  groups: EdgeAdaptiveGroup[],
) {
  if (groups.length === 0) {
    return
  }
  const values = groups.map((g) => {
    const bucketStart = new Date(g.datetimeHour)
    return Prisma.sql`(${rollupId(zoneId, host, bucketStart, g.cacheStatus)}, ${zoneId}, ${host}, ${bucketStart}, ${g.cacheStatus}, ${g.count}, ${BigInt(Math.round(g.bytes))}, CURRENT_TIMESTAMP)`
  })
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "EdgeRollupHourly" ("id", "zoneId", "host", "bucketStart", "cacheStatus", "count", "bytes", "updatedAt")
    VALUES ${Prisma.join(values)}
    ON CONFLICT ("id") DO UPDATE SET
      "count" = EXCLUDED."count",
      "bytes" = EXCLUDED."bytes",
      "updatedAt" = CURRENT_TIMESTAMP
  `)
}

export async function listEdgeRollups(
  zoneId: string,
  host: string,
  gte: Date,
  lt?: Date,
): Promise<EdgeRollupRow[]> {
  const rows = await prisma.edgeRollupHourly.findMany({
    where: { zoneId, host, bucketStart: lt ? { gte, lt } : { gte } },
    select: { bucketStart: true, cacheStatus: true, count: true, bytes: true },
  })
  return rows.map((r) => ({
    bucketStart: r.bucketStart,
    cacheStatus: r.cacheStatus,
    count: r.count,
    bytes: Number(r.bytes),
  }))
}

// Earliest captured hour for this zone+host — the start of our edge history.
export async function edgeCoverageStart(
  zoneId: string,
  host: string,
): Promise<Date | null> {
  const { _min } = await prisma.edgeRollupHourly.aggregate({
    where: { zoneId, host },
    _min: { bucketStart: true },
  })
  return _min.bucketStart
}
