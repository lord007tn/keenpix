import dayjs from 'dayjs'
import type { z } from 'zod'
import {
  getOperationsConfigRow,
  saveOperationsConfigRow,
} from '@/data-access/admin/operations-settings'
import { listProjects } from '@/data-access/projects'
import { getCacheHitStats } from '@/data-access/request-logs'
import {
  applyCacheLimits,
  clearCacheStorage,
  getCacheLimits,
  getCacheStorageStats,
} from '@/lib/cache/cache'
import { getQueueStats } from '@/lib/queue/transform-queue'
import type { cacheMaintenanceSchema } from '@/schemas/admin'
import { DEFAULT_ORG } from './constants'

const MB = 1024 * 1024

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

// Instance operations config. Cache caps are editable + hot-applied; transform
// concurrency and queue depth stay env-configured and are surfaced read-only.
export async function getOperationsConfig() {
  const row = await getOperationsConfigRow()
  // Re-assert a persisted override if the running instance has drifted from it
  // (e.g. after a restart that reset the caps to their env defaults).
  applyCacheLimits({
    diskMaxBytes:
      row.diskCacheMaxMb == null ? undefined : row.diskCacheMaxMb * MB,
    memoryMaxBytes:
      row.memoryCacheMaxMb == null ? undefined : row.memoryCacheMaxMb * MB,
  })
  const limits = getCacheLimits()
  const queue = getQueueStats()
  return {
    diskCacheMaxMb: Math.round(limits.diskMaxBytes / MB),
    memoryCacheMaxMb: Math.round(limits.memoryMaxBytes / MB),
    diskOverride: row.diskCacheMaxMb != null,
    memoryOverride: row.memoryCacheMaxMb != null,
    transformConcurrency: queue.concurrency,
    maxQueueDepth: queue.maxQueue,
  }
}

export async function updateOperationsConfig(input: {
  diskCacheMaxMb: number
  memoryCacheMaxMb: number
}) {
  await saveOperationsConfigRow(input)
  applyCacheLimits({
    diskMaxBytes: input.diskCacheMaxMb * MB,
    memoryMaxBytes: input.memoryCacheMaxMb * MB,
  })
  return getOperationsConfig()
}
