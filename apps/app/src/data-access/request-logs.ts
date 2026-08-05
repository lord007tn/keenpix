import { prisma } from '@keenpix/database'

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

// Request-log WRITES go through the batched analytics buffer
// (src/lib/analytics-buffer/buffer.ts), never a per-request insert — the public
// /img path enqueues in memory and the flusher batches Postgres + ClickHouse.

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
