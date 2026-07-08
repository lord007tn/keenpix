import { prisma } from '@/db'
import { recordRequestEvent } from '@/lib/clickhouse/events'
import { updateAnalyticsRollupForLog } from './analytics-rollups'

export interface NewRequestLog {
  bytesIn: number
  bytesOut: number
  bytesSaved: number
  cached: boolean
  country?: string
  format: string
  latencyMs: number
  orgId: string
  path: string
  projectId: string
  quality?: number
  region?: string
  sourceHost?: string
  status: number
  width?: number
}

export async function createRequestLog(log: NewRequestLog) {
  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.requestLog.create({
      data: {
        orgId: log.orgId,
        projectId: log.projectId,
        path: log.path,
        width: log.width ?? null,
        quality: log.quality ?? null,
        format: log.format,
        status: log.status,
        cached: log.cached,
        latencyMs: log.latencyMs,
        bytesIn: log.bytesIn,
        bytesOut: log.bytesOut,
        bytesSaved: log.bytesSaved,
        region: log.region ?? null,
        country: log.country ?? null,
        sourceHost: log.sourceHost ?? null,
      },
      select: { id: true, ts: true },
    })
    await updateAnalyticsRollupForLog(tx, { ...log, ts: created.ts })
    return created
  })
  // Best-effort mirror into ClickHouse for the advanced-logs tier, after the
  // Postgres write commits so a rolled-back log is never mirrored. No-op unless
  // ClickHouse is configured.
  recordRequestEvent({ ...log, id: row.id, ts: row.ts })
}

// Operator-only cross-tenant cache-hit stats for the platform admin health view.
// Deliberately NOT org-scoped — never use this for a tenant-facing read.
export async function getCacheHitStatsAllOrgs(since: Date) {
  const where = { ts: { gte: since } }
  const [totalRequests, cachedRequests] = await Promise.all([
    prisma.requestLog.count({ where }),
    prisma.requestLog.count({ where: { ...where, cached: true } }),
  ])
  return { cachedRequests, totalRequests }
}
