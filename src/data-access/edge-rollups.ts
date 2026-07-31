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

function captureStateId(zoneId: string, host: string) {
  return createHash('md5').update(`${zoneId}|${host}`).digest('hex')
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

export function getEdgeCaptureState(zoneId: string, host: string) {
  return prisma.edgeCaptureState.findUnique({
    where: { zoneId_host: { zoneId, host } },
  })
}

export async function recordEdgeCaptureSuccess(input: {
  coveredFrom: Date
  coveredUntil: Date
  groups: number
  host: string
  zoneId: string
}) {
  const previous = await getEdgeCaptureState(input.zoneId, input.host)
  const overlaps =
    previous?.coveredUntil &&
    previous.coveredUntil.getTime() >= input.coveredFrom.getTime()
  const coveredFrom =
    overlaps && previous.coveredFrom
      ? new Date(
          Math.min(previous.coveredFrom.getTime(), input.coveredFrom.getTime()),
        )
      : input.coveredFrom
  const coveredUntil =
    overlaps && previous.coveredUntil
      ? new Date(
          Math.max(
            previous.coveredUntil.getTime(),
            input.coveredUntil.getTime(),
          ),
        )
      : input.coveredUntil
  return prisma.edgeCaptureState.upsert({
    where: { zoneId_host: { zoneId: input.zoneId, host: input.host } },
    create: {
      id: captureStateId(input.zoneId, input.host),
      zoneId: input.zoneId,
      host: input.host,
      status: input.groups === 0 ? 'ok_empty' : 'ready',
      groups: input.groups,
      coveredFrom,
      coveredUntil,
      lastAttemptAt: input.coveredUntil,
      lastSuccessAt: input.coveredUntil,
    },
    update: {
      status: input.groups === 0 ? 'ok_empty' : 'ready',
      groups: input.groups,
      coveredFrom,
      coveredUntil,
      lastAttemptAt: input.coveredUntil,
      lastSuccessAt: input.coveredUntil,
      lastError: null,
    },
  })
}

export function recordEdgeCaptureFailure(input: {
  attemptedAt: Date
  error: string
  host: string
  zoneId: string
}) {
  return prisma.edgeCaptureState.upsert({
    where: { zoneId_host: { zoneId: input.zoneId, host: input.host } },
    create: {
      id: captureStateId(input.zoneId, input.host),
      zoneId: input.zoneId,
      host: input.host,
      status: 'failed',
      groups: 0,
      lastAttemptAt: input.attemptedAt,
      lastError: input.error,
    },
    update: {
      status: 'failed',
      lastAttemptAt: input.attemptedAt,
      lastError: input.error,
    },
  })
}
