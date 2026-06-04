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

export async function createRequestLog(log: NewRequestLog): Promise<void> {
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
