import { prisma } from '@/db'
import type { Prisma } from '@/generated/prisma/client'
import { isLogFormat } from '@/shared/types'

export interface LogListFilters {
  cache?: string[]
  domain?: string[]
  format?: string[]
  gte?: Date
  lt?: Date
  search?: string
  status?: string[]
}

export async function listLogs({
  orgId,
  filters,
  limit = 36,
  projectId,
}: {
  orgId: string
  filters?: LogListFilters
  limit?: number
  projectId?: string
}) {
  // Tenant scope first — every log row is org-scoped, so this bounds the query
  // to the caller's org before any project/other filter narrows it further.
  const where: Prisma.RequestLogWhereInput = { orgId }
  const search = filters?.search?.trim()

  if (projectId) {
    where.projectId = projectId
  }
  if (filters?.gte || filters?.lt) {
    where.ts = { gte: filters.gte, lt: filters.lt }
  }
  if (filters?.format && filters.format.length > 0) {
    where.format = { in: filters.format.filter(isLogFormat) }
  }
  if (filters?.status && filters.status.length > 0) {
    const statuses = filters.status.map(Number).filter((n) => !Number.isNaN(n))
    if (statuses.length > 0) {
      where.status = { in: statuses }
    }
  }
  if (filters?.cache && filters.cache.length === 1) {
    if (filters.cache[0] === 'hit') {
      where.cached = true
    }
    if (filters.cache[0] === 'miss') {
      where.cached = false
    }
  }
  if (filters?.domain && filters.domain.length > 0) {
    where.sourceHost = { in: filters.domain }
  }
  if (search && search.length >= 2) {
    const numeric = Number(search)
    where.OR = [
      { path: { contains: search, mode: 'insensitive' } },
      { sourceHost: { contains: search, mode: 'insensitive' } },
    ]
    if (search.length >= 8) {
      where.OR.push({ id: search })
    }
    if (isLogFormat(search)) {
      where.OR.push({ format: search })
    }
    if (Number.isInteger(numeric)) {
      where.OR.push({ status: numeric })
    }
  }

  const rows = await prisma.requestLog.findMany({
    where,
    orderBy: { ts: 'desc' },
    take: Math.min(Math.max(limit, 1), 500),
  })
  return rows.map((r) => ({
    id: r.id,
    projectId: r.projectId,
    // Full ISO timestamp; the UI formats it (absolute + relative) with dayjs.
    ts: r.ts.toISOString(),
    path: r.path,
    sourceHost: r.sourceHost ?? null,
    w: r.width ?? 0,
    q: r.quality ?? 0,
    format: isLogFormat(r.format) ? r.format : 'jpeg',
    status: r.status,
    cached: r.cached,
    latency: r.latencyMs,
    bytesIn: r.bytesIn,
    bytesOut: r.bytesOut,
    bytesSaved: r.bytesSaved,
  }))
}
