import { transformImage } from '@keenpix/transform/sharp'
import { LRUCache } from 'lru-cache'
import source from '../../public/brand/keenpix-og.png?inline'

// Vite embeds these server-owned bytes in the app bundle; no filesystem or network lookup.
const original = Buffer.from(source.split(',')[1], 'base64')
const cache = new LRUCache<string, Awaited<ReturnType<typeof transformImage>>>({
  maxSize: 32 * 1024 * 1024,
  sizeCalculation: (value) => value.data.byteLength,
})
const pending = new Map<
  string,
  Promise<Awaited<ReturnType<typeof transformImage>>>
>()
let tail = Promise.resolve()
let waiters = 0
let usage = {
  requests: 0,
  misses: 0,
  errors: 0,
  overloads: 0,
  bySample: { og: 0 },
  byFormat: { avif: 0, webp: 0, jpeg: 0 },
}
// A fixed histogram bounds memory even under sustained traffic.
const buckets = [
  10,
  25,
  50,
  100,
  250,
  500,
  1000,
  2500,
  5000,
  10_000,
  Number.POSITIVE_INFINITY,
]
let maxEncodeMs = 0
let timings = buckets.map(() => 0)
setInterval(() => {
  if (!usage.requests) {
    return
  }
  const count = timings.reduce((sum, n) => sum + n, 0)
  let cumulative = 0
  const bucket = timings.findIndex((n) => {
    cumulative += n
    return cumulative >= count * 0.95
  })
  console.info(
    JSON.stringify({
      event: 'demo_usage',
      windowSeconds: 300,
      ...usage,
      p95EncodeMs: count ? Math.min(buckets[bucket], maxEncodeMs) : 0,
    }),
  )
  usage = {
    requests: 0,
    misses: 0,
    errors: 0,
    overloads: 0,
    bySample: { og: 0 },
    byFormat: { avif: 0, webp: 0, jpeg: 0 },
  }
  maxEncodeMs = 0
  timings = buckets.map(() => 0)
}, 300_000).unref()

export function recordDemoError() {
  usage.requests++
  usage.errors++
}

export async function generateDemoImage(
  format: 'avif' | 'webp' | 'jpeg',
  quality: number,
  width: number,
) {
  usage.requests++
  usage.bySample.og++
  usage.byFormat[format]++
  const key = `og.png?fmt=${format}&q=${quality}&w=${width}`
  const cached = cache.get(key)
  if (cached) {
    return { image: cached, cache: 'HIT', originalBytes: original.length }
  }
  // Includes coalesced callers: never retain an unbounded number of waiting requests.
  if (waiters >= 8) {
    usage.overloads++
    return null
  }
  waiters++
  let encode = pending.get(key)
  if (!encode) {
    usage.misses++
    encode = tail.then(async () => {
      const start = performance.now()
      try {
        const image = await transformImage(
          original,
          {
            format,
            quality,
            width,
            fit: 'inside',
            enlarge: false,
            animated: false,
          },
          { maxDimension: 1200, maxInputPixels: 2_000_000 },
        )
        cache.set(key, image)
        return image
      } finally {
        const elapsed = performance.now() - start
        maxEncodeMs = Math.max(maxEncodeMs, elapsed)
        timings[buckets.findIndex((limit) => elapsed <= limit)]++
      }
    })
    pending.set(key, encode)
    tail = encode.then(
      () => undefined,
      () => undefined,
    )
  }
  try {
    return {
      image: await encode,
      cache: 'MISS',
      originalBytes: original.length,
    }
  } catch (error) {
    usage.errors++
    throw error
  } finally {
    pending.delete(key)
    waiters--
  }
}
