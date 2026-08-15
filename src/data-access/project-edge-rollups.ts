import { createHash } from 'node:crypto'
import dayjs from 'dayjs'
import { prisma } from '@/db'
import { Prisma } from '@/generated/prisma/client'
import type { ProjectEdgeAdaptiveGroup } from '@/lib/cloudflare/project-edge-analytics'

function projectEdgeRollupId(
  group: ProjectEdgeAdaptiveGroup,
  bucketStart: Date,
) {
  return createHash('md5')
    .update(
      `${bucketStart.toISOString()}|${group.projectId}|${group.host}|${group.stage}|${group.cacheStatus}|${group.status}`,
    )
    .digest('hex')
}

export async function upsertProjectEdgeRollups(
  groups: ProjectEdgeAdaptiveGroup[],
) {
  if (groups.length === 0) {
    return 0
  }
  const projectIds = [...new Set(groups.map((group) => group.projectId))]
  const [projects, deletedProjects] = await Promise.all([
    prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, orgId: true },
    }),
    prisma.projectBillingAttribution.findMany({
      where: { projectId: { in: projectIds } },
      select: { projectId: true, orgId: true },
    }),
  ])
  const orgByProject = new Map(
    deletedProjects.map((project) => [project.projectId, project.orgId]),
  )
  for (const project of projects) {
    orgByProject.set(project.id, project.orgId)
  }
  const attributed = groups.filter((group) => orgByProject.has(group.projectId))
  if (attributed.length === 0) {
    return 0
  }
  const values = attributed.map((group) => {
    const bucketStart = dayjs(group.bucketStart).toDate()
    return Prisma.sql`(${projectEdgeRollupId(group, bucketStart)}, ${bucketStart}, ${orgByProject.get(group.projectId)}, ${group.projectId}, ${group.host}, ${group.stage}, ${group.cacheStatus}, ${group.status}, ${group.requests}, ${BigInt(group.bytes)}, CURRENT_TIMESTAMP)`
  })
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "ProjectEdgeRollupHourly" ("id", "bucketStart", "orgId", "projectId", "host", "stage", "cacheStatus", "status", "requests", "bytes", "updatedAt")
    VALUES ${Prisma.join(values)}
    ON CONFLICT ("id") DO UPDATE SET
      "requests" = EXCLUDED."requests",
      "bytes" = EXCLUDED."bytes",
      "updatedAt" = CURRENT_TIMESTAMP
  `)
  return attributed.length
}

export async function listProjectEdgeRollups(input: {
  gte: Date
  lt: Date
  orgId?: string
  projectId?: string
}) {
  const rows = await prisma.projectEdgeRollupHourly.findMany({
    where: {
      bucketStart: { gte: input.gte, lt: input.lt },
      orgId: input.orgId,
      projectId: input.projectId,
    },
    select: {
      bucketStart: true,
      bytes: true,
      cacheStatus: true,
      requests: true,
      stage: true,
      status: true,
    },
  })
  return rows.map((row) => ({
    bucketStart: row.bucketStart,
    bytes: Number(row.bytes),
    cacheStatus: row.cacheStatus,
    count: row.requests,
    stage: row.stage,
    status: row.status,
  }))
}

export async function projectEdgeCoverageStart(input: {
  orgId?: string
  projectId?: string
}) {
  const result = await prisma.projectEdgeRollupHourly.aggregate({
    where: { orgId: input.orgId, projectId: input.projectId },
    _min: { bucketStart: true },
  })
  return result._min.bucketStart
}

export function getProjectEdgeCaptureState() {
  return prisma.projectEdgeCaptureState.findUnique({ where: { id: 'default' } })
}

export async function recordProjectEdgeCaptureSuccess(input: {
  coveredFrom: Date
  coveredUntil: Date
  groups: number
}) {
  const previous = await getProjectEdgeCaptureState()
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
  return prisma.projectEdgeCaptureState.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
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

export function recordProjectEdgeCaptureFailure(input: {
  attemptedAt: Date
  error: string
}) {
  return prisma.projectEdgeCaptureState.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
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
