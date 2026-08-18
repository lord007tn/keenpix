// Promote legacy zone-wide Cloudflare cache offloads into one project's
// trusted edge history. This is only valid when the operator can prove that the
// selected legacy zone/host traffic belonged exclusively to that project.
//
// The default `plan` mode is read-only. Execute only after reviewing the
// printed cutoff and totals:
//
//   PROJECT_EDGE_BACKFILL_MODE=execute \
//   PROJECT_EDGE_BACKFILL_PROJECT_ID=<project-id> \
//   PROJECT_EDGE_BACKFILL_ACKNOWLEDGE_EXCLUSIVE_PROJECT=yes \
//   pnpm db:backfill-project-edge
//
// By default the cutoff is the first hour already present in trusted Worker
// telemetry. Only full hours strictly before it are copied. An explicit,
// hour-aligned PROJECT_EDGE_BACKFILL_BEFORE may move the boundary earlier.

import { PrismaClient } from '@keenpix/database/client'
import { PrismaPg } from '@prisma/adapter-pg'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

const BATCH_SIZE = 500
const EDGE_OFFLOAD_STATUSES = ['hit', 'ignored', 'stale', 'updating']
const LEGACY_ID_PREFIX = 'legacy-zone:'
const mode = process.env.PROJECT_EDGE_BACKFILL_MODE?.trim() ?? 'plan'
const projectId = process.env.PROJECT_EDGE_BACKFILL_PROJECT_ID?.trim()
const acknowledged =
  process.env.PROJECT_EDGE_BACKFILL_ACKNOWLEDGE_EXCLUSIVE_PROJECT?.trim() ===
  'yes'

if (!['execute', 'plan'].includes(mode)) {
  throw new Error('PROJECT_EDGE_BACKFILL_MODE must be plan or execute.')
}
if (!projectId) {
  throw new Error('Set PROJECT_EDGE_BACKFILL_PROJECT_ID before backfilling.')
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('Set DATABASE_URL before backfilling.')
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
})
const idPrefix = `${LEGACY_ID_PREFIX}${projectId}:`

async function main() {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, orgId: true },
  })
  if (!project) {
    throw new Error(`Project ${projectId} does not exist.`)
  }

  const trustedStart = await prisma.projectEdgeRollupHourly.aggregate({
    where: { projectId, NOT: { id: { startsWith: idPrefix } } },
    _min: { bucketStart: true },
  })
  const configuredCutoff = process.env.PROJECT_EDGE_BACKFILL_BEFORE?.trim()
  const cutoff = configuredCutoff
    ? dayjs.utc(configuredCutoff)
    : dayjs(trustedStart._min.bucketStart).utc()
  if (!cutoff.isValid()) {
    throw new Error(
      'No trusted project telemetry exists. Set an hour-aligned PROJECT_EDGE_BACKFILL_BEFORE.',
    )
  }
  if (!cutoff.isSame(cutoff.startOf('hour'))) {
    throw new Error('PROJECT_EDGE_BACKFILL_BEFORE must be hour-aligned.')
  }
  if (
    trustedStart._min.bucketStart &&
    cutoff.isAfter(dayjs(trustedStart._min.bucketStart))
  ) {
    throw new Error(
      'The backfill cutoff cannot be after the first trusted project hour.',
    )
  }

  const conflictingProjects = await prisma.projectEdgeRollupHourly.findMany({
    where: {
      bucketStart: { lt: cutoff.toDate() },
      projectId: { not: projectId },
    },
    distinct: ['projectId'],
    select: { projectId: true },
    take: 5,
  })
  if (conflictingProjects.length > 0) {
    throw new Error(
      `Trusted telemetry already attributes pre-cutoff traffic to ${conflictingProjects.length} other project(s); the legacy zone is not safely exclusive.`,
    )
  }

  const sourceRows = await prisma.edgeRollupHourly.findMany({
    where: {
      bucketStart: { lt: cutoff.toDate() },
      cacheStatus: { in: EDGE_OFFLOAD_STATUSES, mode: 'insensitive' },
    },
    orderBy: [{ bucketStart: 'asc' }, { id: 'asc' }],
  })
  const expected = sourceRows.reduce(
    (total, row) => ({
      bytes: total.bytes + row.bytes,
      requests: total.requests + BigInt(row.count),
    }),
    { bytes: 0n, requests: 0n },
  )
  const sourceScopes = new Set(
    sourceRows.map((row) => `${row.zoneId}/${row.host || '*'}`),
  )

  process.stdout.write(
    `${JSON.stringify(
      {
        mode,
        project: {
          id: project.id,
          name: project.name,
          orgId: project.orgId,
        },
        cutoffExclusive: cutoff.toISOString(),
        sourceScopes: [...sourceScopes],
        rows: sourceRows.length,
        requests: expected.requests.toString(),
        bytes: expected.bytes.toString(),
      },
      null,
      2,
    )}\n`,
  )

  if (mode === 'plan') {
    process.stdout.write(
      'Plan only: no rows changed. Review the scope and rerun with execute plus the exclusivity acknowledgement.\n',
    )
    return
  }
  if (!acknowledged) {
    throw new Error(
      'Execution requires PROJECT_EDGE_BACKFILL_ACKNOWLEDGE_EXCLUSIVE_PROJECT=yes.',
    )
  }

  for (let offset = 0; offset < sourceRows.length; offset += BATCH_SIZE) {
    const batch = sourceRows.slice(offset, offset + BATCH_SIZE)
    await prisma.projectEdgeRollupHourly.createMany({
      data: batch.map((row) => ({
        id: `${idPrefix}${row.id}`,
        bucketStart: row.bucketStart,
        orgId: project.orgId,
        projectId: project.id,
        host: row.host,
        stage: 'edge',
        cacheStatus: row.cacheStatus.toLowerCase(),
        status: 200,
        requests: row.count,
        bytes: row.bytes,
      })),
      skipDuplicates: true,
    })
  }

  const [actual, rowCount] = await Promise.all([
    prisma.projectEdgeRollupHourly.aggregate({
      where: {
        id: { startsWith: idPrefix },
        bucketStart: { lt: cutoff.toDate() },
      },
      _sum: { bytes: true, requests: true },
    }),
    prisma.projectEdgeRollupHourly.count({
      where: {
        id: { startsWith: idPrefix },
        bucketStart: { lt: cutoff.toDate() },
      },
    }),
  ])
  const actualBytes = actual._sum.bytes ?? 0n
  const actualRequests = BigInt(actual._sum.requests ?? 0)
  if (
    rowCount !== sourceRows.length ||
    actualBytes !== expected.bytes ||
    actualRequests !== expected.requests
  ) {
    throw new Error(
      `Backfill reconciliation failed: sourceRows=${sourceRows.length} targetRows=${rowCount} sourceRequests=${expected.requests} targetRequests=${actualRequests} sourceBytes=${expected.bytes} targetBytes=${actualBytes}.`,
    )
  }

  process.stdout.write(
    `Reconciled ${rowCount} rows, ${actualRequests} requests, and ${actualBytes} bytes.\n`,
  )
}

main()
  .catch((error) => {
    process.stderr.write(`${String(error)}\n`)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
