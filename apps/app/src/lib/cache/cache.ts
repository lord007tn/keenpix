import { createTransformCache } from '@keenpix/cache'
import { env } from '@/env/server'
import { isCloud } from '@/server/deployment'

const objectStorage =
  isCloud() &&
  env.KEENPIX_CACHE_S3_BUCKET &&
  env.KEENPIX_CACHE_S3_ENDPOINT &&
  env.KEENPIX_CACHE_S3_ACCESS_KEY_ID &&
  env.KEENPIX_CACHE_S3_SECRET_ACCESS_KEY
    ? {
        accessKeyId: env.KEENPIX_CACHE_S3_ACCESS_KEY_ID,
        bucket: env.KEENPIX_CACHE_S3_BUCKET,
        endpoint: env.KEENPIX_CACHE_S3_ENDPOINT,
        region: env.KEENPIX_CACHE_S3_REGION,
        secretAccessKey: env.KEENPIX_CACHE_S3_SECRET_ACCESS_KEY,
      }
    : undefined

const transformCache = createTransformCache({
  cacheControl: env.KEENPIX_CACHE_CONTROL,
  dir: env.KEENPIX_CACHE_DIR,
  maxBytes: env.KEENPIX_CACHE_MAX_BYTES,
  memoryMaxBytes: env.KEENPIX_MEMORY_CACHE_MAX_BYTES,
  s3: objectStorage,
  staleMs: env.KEENPIX_CACHE_STALE_MS,
})

export const buildCacheKey = transformCache.buildKey
export const cacheControl = () => transformCache.cacheControl
export const readCacheEntry = transformCache.read
export const writeCache = transformCache.write
export const getCacheRuntimeStats = transformCache.stats
export const getCacheLimits = transformCache.limits
export const applyCacheLimits = transformCache.applyLimits
export const getCacheStorageStats = transformCache.inspect
export const clearCacheStorage = transformCache.clear

export function probeDurableCache() {
  return objectStorage
    ? transformCache.probe().then((ok) => ({ tier: 'object' as const, ok }))
    : null
}
