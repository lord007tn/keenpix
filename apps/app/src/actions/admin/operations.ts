import dayjs from 'dayjs'
import type { z } from 'zod'
import {
  getOperationsConfigRow,
  saveOperationsConfigRow,
} from '@/data-access/admin/operations-settings'
import { rollupSinceFor } from '@/data-access/analytics-rollups'
import { countAllProjects } from '@/data-access/projects'
import { getCacheHitStatsAllOrgs } from '@/data-access/request-logs'
import {
  listResourceRollups,
  pruneResourceRollups,
  upsertResourceRollup,
} from '@/data-access/resource-rollups'
import {
  applyCacheLimits,
  clearCacheStorage,
  getCacheLimits,
  getCacheStorageStats,
} from '@/lib/cache/cache'
import { getQueueStats } from '@/lib/queue/transform-queue'
import {
  getResourceLiveStats,
  readResourceSnapshot,
  recordSample,
} from '@/lib/system/container-stats'
import type { cacheMaintenanceSchema } from '@/schemas/admin'
import type { AnalyticsRange } from '@/shared/types'

const MB = 1024 * 1024

// Sample the container's CPU/RAM every 5s into the in-process ring/peak state so
// the operations page reads near-realtime, persisting one aggregated row per
// hour. Keep ~90 days of hourly history.
const RESOURCE_SAMPLE_MS = 5000
const RESOURCE_RETENTION_DAYS = 90

declare global {
  var __keenpixResourceSampler: ReturnType<typeof setInterval> | undefined
}

async function sampleResourceTick() {
  const completed = recordSample(await readResourceSnapshot())
  if (completed) {
    await upsertResourceRollup(completed)
    await pruneResourceRollups(
      dayjs().subtract(RESOURCE_RETENTION_DAYS, 'day').toDate(),
    )
  }
}

// Start the background resource sampler once per process. Idempotent and guarded
// on a global (like the Prisma client) so HMR or repeat calls never stack timers.
// Called from the operations page load and the /api/health check, so it stays
// alive from shortly after boot even when nobody has the page open.
export function ensureResourceSampler() {
  if (globalThis.__keenpixResourceSampler) {
    return
  }
  const timer = setInterval(() => {
    sampleResourceTick().catch(() => {
      // Best-effort sampling — a transient read/write failure just skips a tick.
    })
  }, RESOURCE_SAMPLE_MS)
  // Never let the sampler hold the event loop open on shutdown.
  timer.unref?.()
  globalThis.__keenpixResourceSampler = timer
  // Kick an immediate first sample so the page has data without waiting a tick.
  sampleResourceTick().catch(() => {
    // Best-effort — the next interval tick retries.
  })
}

// Re-assert a persisted cache-cap override onto the running instance.
// applyCacheLimits no-ops values that already match, so it's safe to call on any
// ops page load — it realigns an instance that booted with its env defaults.
async function reassertCacheOverride() {
  const row = await getOperationsConfigRow()
  applyCacheLimits({
    diskMaxBytes:
      row.diskCacheMaxMb == null ? undefined : row.diskCacheMaxMb * MB,
    memoryMaxBytes:
      row.memoryCacheMaxMb == null ? undefined : row.memoryCacheMaxMb * MB,
  })
}

export async function getOperationsHealth() {
  const uptimeSeconds = Math.round(process.uptime())
  ensureResourceSampler()
  await reassertCacheOverride()
  const since = dayjs().subtract(uptimeSeconds, 'second').toDate()
  // Operator health reflects the INSTANCE itself — cache/CPU/RAM/queue plus the
  // instance-wide project count and cache-hit rate across every tenant it serves
  // (in self-host that is just org_default). It is never tenant-scoped.
  const [cache, projectCount, cacheHits, resources] = await Promise.all([
    getCacheStorageStats(),
    countAllProjects(),
    getCacheHitStatsAllOrgs(since),
    getResourceLiveStats(),
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
    projectCount,
    resources,
    transformQueue: getQueueStats(),
    uptimeSeconds,
  }
}

// Hourly CPU/RAM history for the selected range, from the persisted rollups.
// Powers the capacity-planning trend chart ("when to expand").
export async function getResourceTrend(range: AnalyticsRange) {
  const points = await listResourceRollups(rollupSinceFor(range))
  return { points, range }
}

export function runCacheMaintenance(
  input: z.output<typeof cacheMaintenanceSchema>,
) {
  return clearCacheStorage(input.target)
}

// Instance operations config. Cache caps are editable + hot-applied; transform
// concurrency and queue depth stay env-configured and are surfaced read-only.
export async function getOperationsConfig() {
  await reassertCacheOverride()
  const row = await getOperationsConfigRow()
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
