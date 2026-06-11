import dayjs from 'dayjs'
import type { z } from 'zod'
import { listProjects } from '@/data-access/projects'
import { clearCacheStorage, getCacheStorageStats } from '@/lib/cache/cache'
import { getQueueStats } from '@/lib/queue/transform-queue'
import type { cacheMaintenanceSchema } from '@/schemas/admin'
import { DEFAULT_ORG } from './constants'

export async function getOperationsHealth() {
  const [cache, projects] = await Promise.all([
    getCacheStorageStats(),
    listProjects(DEFAULT_ORG),
  ])
  return {
    cache,
    generatedAt: dayjs().toISOString(),
    projectCount: projects.length,
    transformQueue: getQueueStats(),
    uptimeSeconds: Math.round(process.uptime()),
  }
}

export function runCacheMaintenance(
  input: z.output<typeof cacheMaintenanceSchema>,
) {
  return clearCacheStorage(input.target)
}
