import { createHash, randomUUID } from 'node:crypto'
import {
  mkdir,
  readdir,
  readFile,
  rename,
  stat,
  unlink,
  utimes,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { LRUCache } from 'lru-cache'
import { env } from '@/env/server'

const CACHE_DIR = env.KEENPIX_CACHE_DIR
const MAX_BYTES = env.KEENPIX_CACHE_MAX_BYTES
const MEMORY_MAX_BYTES = env.KEENPIX_MEMORY_CACHE_MAX_BYTES
/** After eviction we leave roughly this much headroom (90% of cap). */
const TARGET_BYTES = Math.floor(MAX_BYTES * 0.9)
/** Only enumerate the cache every Nth write (avoids stat'ing on every request). */
const EVICTION_PROBE_EVERY = 50

const EXT: Record<string, string> = {
  avif: 'avif',
  webp: 'webp',
  jpeg: 'jpg',
  png: 'png',
}

const memoryCache =
  MEMORY_MAX_BYTES > 0
    ? new LRUCache<string, Buffer>({
        maxSize: MEMORY_MAX_BYTES,
        sizeCalculation: (value) => value.byteLength,
      })
    : null

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

/** Content-addressed cache key — includes format so the CDN/disk key is per-format (CDN-safe). */
export function buildCacheKey(input: TransformKeyInput): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex')
}

/** Long-lived immutable caching — what lets a CDN (Cloudflare) cache the response. */
export function cacheControl(): string {
  return 'public, max-age=31536000, immutable'
}

function pathFor(key: string, fmt: string): string {
  return path.join(CACHE_DIR, `${key}.${EXT[fmt] ?? 'bin'}`)
}

function memoryKey(key: string, fmt: string) {
  return `${key}.${fmt}`
}

export async function readCache(
  key: string,
  fmt: string,
): Promise<Buffer | null> {
  const hot = memoryCache?.get(memoryKey(key, fmt))
  if (hot) {
    return hot
  }

  const file = pathFor(key, fmt)
  try {
    const buf = await readFile(file)
    if (buf.length === 0) {
      return null
    }
    // Bump mtime so the LRU sweep treats this as recently used.
    const now = new Date()
    utimes(file, now, now).catch(() => {
      // ignore
    })
    memoryCache?.set(memoryKey(key, fmt), buf)
    return buf
  } catch {
    return null
  }
}

let writeCount = 0

export async function writeCache(
  key: string,
  fmt: string,
  data: Buffer,
): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true })
  const final = pathFor(key, fmt)
  // Write to a unique temp file then atomically rename into place. A crash or two
  // racing writers can't leave a torn/partial image to be served and then cached
  // downstream forever under our immutable Cache-Control.
  const tmp = `${final}.${randomUUID()}.tmp`
  try {
    await writeFile(tmp, data)
    await rename(tmp, final)
    memoryCache?.set(memoryKey(key, fmt), data)
  } catch (err) {
    await unlink(tmp).catch(() => {
      // temp may not exist; ignore
    })
    throw err
  }
  writeCount++
  if (writeCount >= EVICTION_PROBE_EVERY) {
    writeCount = 0
    maybeEvict().catch(() => {
      // best-effort
    })
  }
}

export function getCacheRuntimeStats() {
  return {
    diskMaxBytes: MAX_BYTES,
    memoryItemCount: memoryCache?.size ?? 0,
    memoryMaxBytes: MEMORY_MAX_BYTES,
    memorySizeBytes: memoryCache?.calculatedSize ?? 0,
  }
}

/**
 * If the cache directory exceeds KEENPIX_CACHE_MAX_BYTES, delete the
 * least-recently-used files (mtime ascending) until back under 90% of the cap.
 * Cheap LRU — no separate index needed.
 */
async function maybeEvict(): Promise<void> {
  let entries: Array<{ file: string; size: number; mtime: number }>
  try {
    const names = await readdir(CACHE_DIR)
    entries = await Promise.all(
      names.map(async (name) => {
        const file = path.join(CACHE_DIR, name)
        const s = await stat(file)
        return { file, size: s.size, mtime: s.mtimeMs }
      }),
    )
  } catch {
    return
  }
  let total = entries.reduce((a, e) => a + e.size, 0)
  if (total <= MAX_BYTES) {
    return
  }
  entries.sort((a, b) => a.mtime - b.mtime)
  for (const e of entries) {
    if (total <= TARGET_BYTES) {
      break
    }
    await unlink(e.file).catch(() => {
      // ignore
    })
    total -= e.size
  }
}
