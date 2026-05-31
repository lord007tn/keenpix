import { readCache, writeCache } from '@/lib/cdn/cache'
import {
  type OutputFormat,
  type TransformOptions,
  transformImage,
} from '@/lib/sharp/transform'
import { runTransformJob } from './concurrency'
import { logCacheWriteError } from './logging'
import { fetchOriginImage } from './origin'
import { type assertSafeOrigin, TransformError } from './ssrf'

type ValidatedOrigin = Awaited<ReturnType<typeof assertSafeOrigin>>

/** In-flight transforms keyed by cache key — lets identical concurrent MISS
 * requests share a single fetch+encode instead of each repeating the expensive
 * work (e.g. a popular image requested many times at once during a cold cache). */
const inflight = new Map<string, Promise<Buffer>>()

export async function readOrCreateTransform({
  allowedOrigins,
  cacheKey,
  format,
  origin,
  transformOptions,
}: {
  allowedOrigins: string[]
  cacheKey: string
  format: OutputFormat
  origin: ValidatedOrigin
  transformOptions: TransformOptions
}) {
  const cachedOut = await readCache(cacheKey, format)
  if (cachedOut) {
    return { out: cachedOut, cached: true, bytesIn: 0 }
  }

  const existing = inflight.get(cacheKey)
  if (existing) {
    // A matching transform is already running — await its result. We didn't
    // fetch the origin ourselves, so bytesIn stays 0 for this request's log.
    return { out: await existing, cached: false, bytesIn: 0 }
  }

  let producedBytesIn = 0
  const work = runTransformJob(async () => {
    const input = await fetchOriginImage(origin, allowedOrigins)
    producedBytesIn = input.byteLength
    let result: Awaited<ReturnType<typeof transformImage>>
    try {
      result = await transformImage(input, transformOptions)
    } catch (err) {
      if (err instanceof TransformError) {
        throw err
      }
      // sharp/libvips couldn't decode it: the origin returned something
      // that isn't a usable image (HTML error page, truncated, bomb).
      throw new TransformError('Origin is not a valid image', 502)
    }
    // Caching is best-effort — a cache-write failure must never turn a
    // successful transform into a 500.
    await writeCache(cacheKey, format, result.data).catch(logCacheWriteError)
    return result.data
  })

  inflight.set(cacheKey, work)
  try {
    return { out: await work, cached: false, bytesIn: producedBytesIn }
  } finally {
    inflight.delete(cacheKey)
  }
}
