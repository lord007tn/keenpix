import { createHash } from 'node:crypto'
import { env } from '@/env/server'
import { DiskCacheStore } from './disk-cache-store'
import { MemoryCacheStore } from './memory-cache-store'

const CACHE_DIR = env.KEENPIX_CACHE_DIR
const MAX_BYTES = env.KEENPIX_CACHE_MAX_BYTES
const MEMORY_MAX_BYTES = env.KEENPIX_MEMORY_CACHE_MAX_BYTES

const memoryCache = new MemoryCacheStore(MEMORY_MAX_BYTES)
const diskCache = new DiskCacheStore(CACHE_DIR, MAX_BYTES)

export interface TransformKeyInput {
  blur?: number
  dpr?: number
  fit: string
  fmt: string
  h?: number
  projectId: string
  q: number
  url: string
  w?: number
}

// Content-addressed cache key. The negotiated format is included so CDN/disk
// entries never collide across AVIF/WebP/JPEG/PNG variants.
export function buildCacheKey(input: TransformKeyInput): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex')
}

// Long-lived immutable caching is what lets an outer CDN cache transform output.
export function cacheControl(): string {
  return 'public, max-age=31536000, immutable'
}

export async function readCache(
  key: string,
  fmt: string,
): Promise<Buffer | null> {
  const hot = await memoryCache.get(key, fmt)
  if (hot) {
    return hot
  }

  const buf = await diskCache.get(key, fmt)
  if (!buf) {
    return null
  }
  await memoryCache.set(key, fmt, buf)
  return buf
}

export async function writeCache(
  key: string,
  fmt: string,
  data: Buffer,
): Promise<void> {
  await diskCache.set(key, fmt, data)
  await memoryCache.set(key, fmt, data)
}

export function getCacheRuntimeStats() {
  return {
    ...diskCache.stats(),
    ...memoryCache.stats(),
  }
}
