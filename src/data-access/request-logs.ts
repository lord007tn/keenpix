import { prisma } from '@/db'

export interface NewRequestLog {
  bytesIn: number
  bytesOut: number
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
  await prisma.requestLog.create({
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
      region: log.region ?? null,
      country: log.country ?? null,
      sourceHost: log.sourceHost ?? null,
    },
  })
}

// Cache hit counts for an org since a point in time. Scoped by orgId so the
// query rides the [orgId, ts] index rather than scanning by timestamp alone.
export async function getCacheHitStats(orgId: string, since: Date) {
  const where = { orgId, ts: { gte: since } }
  const [totalRequests, cachedRequests] = await Promise.all([
    prisma.requestLog.count({ where }),
    prisma.requestLog.count({ where: { ...where, cached: true } }),
  ])
  return { cachedRequests, totalRequests }
}
