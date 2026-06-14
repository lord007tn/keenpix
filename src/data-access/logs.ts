import { prisma } from '@/db'
import { isLogFormat } from '@/shared/types'

export async function listLogs(limit = 36, projectId?: string) {
  const rows = await prisma.requestLog.findMany({
    where: projectId ? { projectId } : undefined,
    orderBy: { ts: 'desc' },
    take: limit,
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
