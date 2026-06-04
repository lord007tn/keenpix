import { prisma } from '@/db'
import { isLogFormat, type LogRow } from '@/shared/types'

export async function listLogs(
  limit = 36,
  projectId?: string,
): Promise<LogRow[]> {
  const rows = await prisma.requestLog.findMany({
    where: projectId ? { projectId } : undefined,
    orderBy: { ts: 'desc' },
    take: limit,
  })
  return rows.map((r) => ({
    id: r.id,
    projectId: r.projectId,
    ts: r.ts.toISOString().replace('T', ' ').slice(5, 19),
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
  }))
}
