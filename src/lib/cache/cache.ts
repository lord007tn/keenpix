import { createHash } from 'node:crypto'
import { env } from '@/env/server'
import type { OutputFormat, TransformOptions } from '@/shared/transform'
import { DiskCacheStore } from './disk-cache-store'
import { MemoryCacheStore } from './memory-cache-store'

const CACHE_DIR = env.KEENPIX_CACHE_DIR
const MAX_BYTES = env.KEENPIX_CACHE_MAX_BYTES
const MEMORY_MAX_BYTES = env.KEENPIX_MEMORY_CACHE_MAX_BYTES

const memoryCache = new MemoryCacheStore(MEMORY_MAX_BYTES)
const diskCache = new DiskCacheStore(CACHE_DIR, MAX_BYTES)

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

export async function readCache(key: string, format: OutputFormat) {
  const hot = await memoryCache.get(key, format)
  if (hot) {
    return hot
  }

  const buf = await diskCache.get(key, format)
  if (!buf) {
    return null
  }
  await memoryCache.set(key, format, buf)
  return buf
}

export async function writeCache(
  key: string,
  format: OutputFormat,
  data: Buffer,
) {
  await diskCache.set(key, format, data)
  await memoryCache.set(key, format, data)
}

export function getCacheRuntimeStats() {
  return {
    ...diskCache.stats(),
    ...memoryCache.stats(),
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
