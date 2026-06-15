import cuid from 'cuid'
import { prisma } from '@/db'
import { Prisma } from '@/generated/prisma/client'
import type { ResourceRollup } from '@/lib/system/container-stats'

// Persist one aggregated row per hour (avg + peak). bucketStart is the upsert
// key (one row per hour), so a re-flush of the same hour — e.g. a partial bucket
// after a mid-hour restart — upserts in place rather than duplicating. id is a
// cuid; the database default never fires because raw SQL provides it explicitly.
export async function upsertResourceRollup(rollup: ResourceRollup) {
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "ResourceRollupHourly" ("id", "bucketStart", "cpuAvgPct", "cpuPeakPct", "cpuCores", "memAvgBytes", "memPeakBytes", "memLimitBytes", "samples", "updatedAt")
    VALUES (
      ${cuid()}, ${rollup.bucketStart}, ${rollup.cpuAvgPct}, ${rollup.cpuPeakPct}, ${rollup.cpuCores},
      ${BigInt(Math.round(rollup.memAvgBytes))}, ${BigInt(Math.round(rollup.memPeakBytes))}, ${BigInt(Math.round(rollup.memLimitBytes))},
      ${rollup.samples}, CURRENT_TIMESTAMP
    )
    ON CONFLICT ("bucketStart") DO UPDATE SET
      "cpuAvgPct" = EXCLUDED."cpuAvgPct",
      "cpuPeakPct" = EXCLUDED."cpuPeakPct",
      "cpuCores" = EXCLUDED."cpuCores",
      "memAvgBytes" = EXCLUDED."memAvgBytes",
      "memPeakBytes" = EXCLUDED."memPeakBytes",
      "memLimitBytes" = EXCLUDED."memLimitBytes",
      "samples" = EXCLUDED."samples",
      "updatedAt" = CURRENT_TIMESTAMP
  `)
}

export async function listResourceRollups(gte: Date, lt?: Date) {
  const rows = await prisma.resourceRollupHourly.findMany({
    where: { bucketStart: lt ? { gte, lt } : { gte } },
    orderBy: { bucketStart: 'asc' },
    select: {
      bucketStart: true,
      cpuAvgPct: true,
      cpuPeakPct: true,
      cpuCores: true,
      memAvgBytes: true,
      memPeakBytes: true,
      memLimitBytes: true,
      samples: true,
    },
  })
  return rows.map((r) => ({
    bucketStart: r.bucketStart,
    cpuAvgPct: r.cpuAvgPct,
    cpuPeakPct: r.cpuPeakPct,
    cpuCores: r.cpuCores,
    memAvgBytes: Number(r.memAvgBytes),
    memPeakBytes: Number(r.memPeakBytes),
    memLimitBytes: Number(r.memLimitBytes),
    samples: r.samples,
  }))
}

// Drop rollups past the retention window so the table never grows unbounded.
export async function pruneResourceRollups(olderThan: Date) {
  await prisma.resourceRollupHourly.deleteMany({
    where: { bucketStart: { lt: olderThan } },
  })
}
