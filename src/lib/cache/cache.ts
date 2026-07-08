import { createHash } from 'node:crypto'
import { env } from '@/env/server'
import { isCloud } from '@/server/deployment'
import type { OutputFormat, TransformOptions } from '@/shared/transform'
import type { CacheEntry, CacheStore } from './cache-store'
import { DiskCacheStore } from './disk-cache-store'
import { MemoryCacheStore } from './memory-cache-store'
import { S3CacheStore } from './s3-cache-store'

const CACHE_DIR = env.KEENPIX_CACHE_DIR
const MAX_BYTES = env.KEENPIX_CACHE_MAX_BYTES
const MEMORY_MAX_BYTES = env.KEENPIX_MEMORY_CACHE_MAX_BYTES
const STALE_MS = env.KEENPIX_CACHE_STALE_MS

const memoryCache = new MemoryCacheStore(MEMORY_MAX_BYTES)
const diskCache = new DiskCacheStore(CACHE_DIR, MAX_BYTES)

// Durable (L2) cache. Cloud with a configured bucket uses shared object storage
// so every replica shares one warm cache; everything else uses local disk. The
// memory store stays the per-instance L1 hot tier in both modes. Disk-specific
// maintenance below (inspect/clear/limits) is self-host-only and stays on disk.
function selectDurableCache(): CacheStore {
  if (
    isCloud() &&
    env.KEENPIX_CACHE_S3_BUCKET &&
    env.KEENPIX_CACHE_S3_ENDPOINT &&
    env.KEENPIX_CACHE_S3_ACCESS_KEY_ID &&
    env.KEENPIX_CACHE_S3_SECRET_ACCESS_KEY
  ) {
    return new S3CacheStore({
      bucket: env.KEENPIX_CACHE_S3_BUCKET,
      endpoint: env.KEENPIX_CACHE_S3_ENDPOINT,
      region: env.KEENPIX_CACHE_S3_REGION,
      accessKeyId: env.KEENPIX_CACHE_S3_ACCESS_KEY_ID,
      secretAccessKey: env.KEENPIX_CACHE_S3_SECRET_ACCESS_KEY,
    })
  }
  return diskCache
}

const durableCache = selectDurableCache()

export interface TransformKeyInput {
  projectId: string
  transformOptions: TransformOptions
  url: string
}

// Content-addressed cache key. The negotiated format is included so CDN/disk
// entries never collide across transform variants.
export function buildCacheKey(input: TransformKeyInput): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex')
}

// Long-lived immutable caching is what lets an outer CDN cache transform output.
export function cacheControl(): string {
  return 'public, max-age=31536000, immutable'
}

export async function readCacheEntry(key: string, format: OutputFormat) {
  const hot = await memoryCache.getEntry(key, format)
  if (hot) {
    return { ...hot, stale: isCacheEntryStale(hot) }
  }

  const entry = await durableCache.getEntry(key, format)
  if (!entry) {
    return null
  }
  memoryCache.setEntry(key, format, entry)
  return { ...entry, stale: isCacheEntryStale(entry) }
}

export async function writeCache(
  key: string,
  format: OutputFormat,
  data: Buffer,
  originalBytes: number,
) {
  await durableCache.set(key, format, data, originalBytes)
  await memoryCache.set(key, format, data, originalBytes)
}

function isCacheEntryStale(entry: CacheEntry) {
  return STALE_MS > 0 && Date.now() - entry.createdAt >= STALE_MS
}

export function getCacheRuntimeStats() {
  return {
    ...diskCache.stats(),
    ...memoryCache.stats(),
  }
}

// Live cache caps for the running instance (bytes). Reflects any hot-applied
// override, not just the boot-time env defaults.
export function getCacheLimits() {
  return {
    diskMaxBytes: diskCache.getMaxBytes(),
    memoryMaxBytes: memoryCache.getMaxBytes(),
  }
}

// Hot-apply cache caps. No-ops a value that already matches so the memory LRU
// is not rebuilt (which would drop the hot set) unless the cap actually changed.
export function applyCacheLimits({
  diskMaxBytes,
  memoryMaxBytes,
}: {
  diskMaxBytes?: number
  memoryMaxBytes?: number
}) {
  if (diskMaxBytes != null && diskMaxBytes !== diskCache.getMaxBytes()) {
    diskCache.setMaxBytes(diskMaxBytes)
  }
  if (memoryMaxBytes != null && memoryMaxBytes !== memoryCache.getMaxBytes()) {
    memoryCache.setMaxBytes(memoryMaxBytes)
  }
}

export async function getCacheStorageStats() {
  return {
    ...(await diskCache.inspect()),
    ...memoryCache.stats(),
  }
}

export async function clearCacheStorage(target: 'all' | 'disk' | 'memory') {
  const before = await getCacheStorageStats()
  const disk =
    target === 'disk' || target === 'all'
      ? await diskCache.clear()
      : { deletedBytes: 0, deletedFiles: 0 }

  if (target === 'memory' || target === 'all') {
    memoryCache.clear()
  }

  const after = await getCacheStorageStats()
  return {
    after,
    before,
    deletedDiskBytes: disk.deletedBytes,
    deletedDiskFiles: disk.deletedFiles,
    target,
  }
}
