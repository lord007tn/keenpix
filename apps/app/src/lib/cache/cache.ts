import { createTransformCache } from '@keenpix/cache'
import { env } from '@/env/server'

const objectStorage =
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
  deleteAfterMs: env.KEENPIX_CACHE_DELETE_AFTER_MS,
  dir: env.KEENPIX_CACHE_DIR,
  dragonflyMaxBytes: env.KEENPIX_CACHE_DRAGONFLY_MAX_BYTES,
  maxBytes: env.KEENPIX_CACHE_MAX_BYTES,
  memoryMaxBytes: env.KEENPIX_MEMORY_CACHE_MAX_BYTES,
  redisUrl: env.KEENPIX_CACHE_REDIS_URL,
  s3: objectStorage,
  staleMs: env.KEENPIX_CACHE_STALE_MS,
})

export const buildCacheKey = transformCache.buildKey
export const cacheControl = () => transformCache.cacheControl
export const readCacheEntry = transformCache.read.bind(transformCache)
export const writeCache = transformCache.write.bind(transformCache)
export const getCacheRuntimeStats = transformCache.stats.bind(transformCache)
export const getCacheLimits = transformCache.limits.bind(transformCache)
export const applyCacheLimits = transformCache.applyLimits.bind(transformCache)
export const getCacheStorageStats = transformCache.inspect.bind(transformCache)
export const clearCacheStorage = transformCache.clear.bind(transformCache)

export function probeDurableCache() {
  return objectStorage || env.KEENPIX_CACHE_REDIS_URL
    ? transformCache.probe().then((ok) => ({ tier: 'object' as const, ok }))
    : null
}
