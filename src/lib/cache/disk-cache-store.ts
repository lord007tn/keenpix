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
import dayjs from 'dayjs'
import type { OutputFormat } from '@/shared/transform'
import type { CacheStore } from './cache-store'

const EXT: Record<OutputFormat, string> = {
  avif: 'avif',
  webp: 'webp',
  jpeg: 'jpg',
  png: 'png',
}

const EVICTION_PROBE_EVERY = 50
const noop = () => undefined

export class DiskCacheStore implements CacheStore {
  private readonly cacheDir
  private readonly maxBytes
  private readonly targetBytes
  private writeCount = 0

  constructor(cacheDir: string, maxBytes: number) {
    this.cacheDir = cacheDir
    this.maxBytes = maxBytes
    this.targetBytes = Math.floor(maxBytes * 0.9)
  }

  async get(key: string, format: OutputFormat) {
    const file = this.pathFor(key, format)
    try {
      const buf = await readFile(file)
      if (buf.length === 0) {
        return null
      }
      // Bump mtime so the LRU sweep treats this as recently used.
      const now = dayjs().toDate()
      utimes(file, now, now).catch(noop)
      return buf
    } catch {
      return null
    }
  }

  async set(key: string, format: OutputFormat, data: Buffer) {
    await mkdir(this.cacheDir, { recursive: true })
    const final = this.pathFor(key, format)
    // Write to a unique temp file then atomically rename into place. A crash or
    // racing writers can't leave a torn image to be cached downstream forever.
    const tmp = `${final}.${randomUUID()}.tmp`
    try {
      await writeFile(tmp, data)
      await rename(tmp, final)
    } catch (err) {
      await unlink(tmp).catch(noop)
      throw err
    }

    this.writeCount++
    if (this.writeCount >= EVICTION_PROBE_EVERY) {
      this.writeCount = 0
      this.maybeEvict().catch(noop)
    }
  }

  stats() {
    return {
      diskMaxBytes: this.maxBytes,
    }
  }

  async inspect() {
    let names: string[]
    try {
      names = await readdir(this.cacheDir)
    } catch {
      return {
        diskFileCount: 0,
        diskMaxBytes: this.maxBytes,
        diskSizeBytes: 0,
      }
    }

    const entries = await Promise.all(
      names.map(async (name) => {
        try {
          const s = await stat(path.join(this.cacheDir, name))
          return s.isFile() ? s.size : null
        } catch {
          return null
        }
      }),
    )
    const sizes = entries.filter((size): size is number => size !== null)
    return {
      diskFileCount: sizes.length,
      diskMaxBytes: this.maxBytes,
      diskSizeBytes: sizes.reduce((total, size) => total + size, 0),
    }
  }

  async clear() {
    let names: string[]
    try {
      names = await readdir(this.cacheDir)
    } catch {
      return { deletedFiles: 0, deletedBytes: 0 }
    }

    const entries = await Promise.all(
      names.map(async (name) => {
        const file = path.join(this.cacheDir, name)
        try {
          const s = await stat(file)
          if (!s.isFile()) {
            return null
          }
          await unlink(file)
          return s.size
        } catch {
          return null
        }
      }),
    )
    const sizes = entries.filter((size): size is number => size !== null)
    return {
      deletedBytes: sizes.reduce((total, size) => total + size, 0),
      deletedFiles: sizes.length,
    }
  }

  private pathFor(key: string, format: OutputFormat) {
    return path.join(this.cacheDir, `${key}.${EXT[format]}`)
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
      await unlink(e.file).catch(noop)
      total -= e.size
    }
  }
}
