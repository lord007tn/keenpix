import { randomUUID } from 'node:crypto'
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
import type { CacheStore } from './cache-store'

const EXT: Record<string, string> = {
  avif: 'avif',
  webp: 'webp',
  jpeg: 'jpg',
  png: 'png',
}

/** Only enumerate the cache every Nth write (avoids stat'ing on every request). */
const EVICTION_PROBE_EVERY = 50

export class DiskCacheStore implements CacheStore {
  private readonly cacheDir
  private readonly maxBytes
  /** After eviction we leave roughly this much headroom (90% of cap). */
  private readonly targetBytes
  private writeCount = 0

  constructor(cacheDir: string, maxBytes: number) {
    this.cacheDir = cacheDir
    this.maxBytes = maxBytes
    this.targetBytes = Math.floor(maxBytes * 0.9)
  }

  async get(key: string, fmt: string) {
    const file = this.pathFor(key, fmt)
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
      return buf
    } catch {
      return null
    }
  }

  async set(key: string, fmt: string, data: Buffer) {
    await mkdir(this.cacheDir, { recursive: true })
    const final = this.pathFor(key, fmt)
    // Write to a unique temp file then atomically rename into place. A crash or
    // racing writers can't leave a torn image to be cached downstream forever.
    const tmp = `${final}.${randomUUID()}.tmp`
    try {
      await writeFile(tmp, data)
      await rename(tmp, final)
    } catch (err) {
      await unlink(tmp).catch(() => {
        // temp may not exist; ignore
      })
      throw err
    }

    this.writeCount++
    if (this.writeCount >= EVICTION_PROBE_EVERY) {
      this.writeCount = 0
      this.maybeEvict().catch(() => {
        // best-effort
      })
    }
  }

  stats() {
    return {
      diskMaxBytes: this.maxBytes,
    }
  }

  private pathFor(key: string, fmt: string) {
    return path.join(this.cacheDir, `${key}.${EXT[fmt] ?? 'bin'}`)
  }

  /**
   * If the cache directory exceeds maxBytes, delete the least-recently-used
   * files (mtime ascending) until back under 90% of the cap.
   */
  private async maybeEvict() {
    let entries: Array<{ file: string; size: number; mtime: number }>
    try {
      const names = await readdir(this.cacheDir)
      entries = await Promise.all(
        names.map(async (name) => {
          const file = path.join(this.cacheDir, name)
          const s = await stat(file)
          return { file, size: s.size, mtime: s.mtimeMs }
        }),
      )
    } catch {
      return
    }

    let total = entries.reduce((a, e) => a + e.size, 0)
    if (total <= this.maxBytes) {
      return
    }
    entries.sort((a, b) => a.mtime - b.mtime)
    for (const e of entries) {
      if (total <= this.targetBytes) {
        break
      }
      await unlink(e.file).catch(() => {
        // ignore
      })
      total -= e.size
    }
  }
}
