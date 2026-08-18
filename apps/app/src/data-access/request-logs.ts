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

export type RequestLogEvent = NewRequestLog & { id: string; ts: Date }

// Request-log writes go through src/lib/analytics-buffer/buffer.ts. Self-hosted
// and failed-request telemetry is batched; successful managed deliveries use
// the same atomic write synchronously so billable bytes survive a process exit.

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
