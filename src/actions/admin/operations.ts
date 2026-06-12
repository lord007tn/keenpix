import dayjs from 'dayjs'
import type { z } from 'zod'
import { listProjects } from '@/data-access/projects'
import { getCacheHitStats } from '@/data-access/request-logs'
import { clearCacheStorage, getCacheStorageStats } from '@/lib/cache/cache'
import { getQueueStats } from '@/lib/queue/transform-queue'
import type { cacheMaintenanceSchema } from '@/schemas/admin'
import { DEFAULT_ORG } from './constants'

export async function getOperationsHealth() {
  const uptimeSeconds = Math.round(process.uptime())
  const [cache, projects, cacheHits] = await Promise.all([
    getCacheStorageStats(),
    listProjects(DEFAULT_ORG),
    getCacheHitStats(
      DEFAULT_ORG,
      dayjs().subtract(uptimeSeconds, 'second').toDate(),
    ),
  ])
  return {
    cache,
    cacheHits: {
      ...cacheHits,
      // null (not 0) when there is no traffic yet, so the UI can tell an empty
      // window apart from a genuinely cold cache.
      hitRate:
        cacheHits.totalRequests === 0
          ? null
          : (cacheHits.cachedRequests / cacheHits.totalRequests) * 100,
    },
    generatedAt: dayjs().toISOString(),
    projectCount: projects.length,
    transformQueue: getQueueStats(),
    uptimeSeconds,
  }
}

export function runCacheMaintenance(
  input: z.output<typeof cacheMaintenanceSchema>,
) {
  return clearCacheStorage(input.target)
}
