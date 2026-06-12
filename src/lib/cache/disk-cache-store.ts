import { randomUUID } from 'node:crypto'
import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import type { OutputFormat } from '@/shared/transform'
import type { CacheStore } from './cache-store'

const EXT: Record<OutputFormat, string> = {
  avif: 'avif',
  gif: 'gif',
  heif: 'heif',
  jpeg: 'jpg',
  png: 'png',
  svg: 'svg',
  tiff: 'tiff',
  webp: 'webp',
}

const noop = () => undefined

interface IndexEntry {
  // Monotonic access counter; higher means more recently used. Kept separate
  // from mtime so LRU ordering never depends on filesystem timestamps.
  accessOrder: number
  // When the variant was generated, used for stale-while-revalidate.
  mtimeMs: number
  path: string
  size: number
}

interface ScannedFile {
  mtimeMs: number
  name: string
  path: string
  size: number
}

export class DiskCacheStore implements CacheStore {
  private readonly cacheDir
  private maxBytes
  private targetBytes
  // In-memory index of every cached file keyed by `${key}.${ext}`. It lets us
  // evict and report stats without scanning the directory, and removes the
  // dependency on filesystem atime for LRU ordering.
  private readonly index = new Map<string, IndexEntry>()
  private readonly ensuredShards = new Set<string>()
  private totalBytes = 0
  private accessOrder = 0
  private evicting: Promise<void> | null = null
  private evictedFiles = 0
  private evictedBytes = 0
  private lastEvictionAt = 0
  private readonly ready

  constructor(cacheDir: string, maxBytes: number) {
    this.cacheDir = cacheDir
    this.maxBytes = maxBytes
    this.targetBytes = Math.floor(maxBytes * 0.9)
    // Learn the on-disk state once at startup, then trim if we booted over the
    // cap (e.g. the byte limit was lowered between runs).
    this.ready = this.buildIndex()
  }

  getMaxBytes() {
    return this.maxBytes
  }

  // Hot-apply a new disk cap; trims immediately if now over the limit.
  setMaxBytes(bytes: number) {
    this.maxBytes = bytes
    this.targetBytes = Math.floor(bytes * 0.9)
    return this.maybeEvict()
  }

  async get(key: string, format: OutputFormat) {
    return (await this.getEntry(key, format))?.data ?? null
  }

  async getEntry(key: string, format: OutputFormat) {
    await this.ready
    const name = `${key}.${EXT[format]}`
    const entry = this.index.get(name)
    if (!entry) {
      return null
    }
    try {
      const buf = await readFile(entry.path)
      if (buf.length === 0) {
        this.forget(name)
        return null
      }
      entry.accessOrder = ++this.accessOrder
      return { createdAt: entry.mtimeMs, data: buf }
    } catch {
      // File vanished underneath us; drop the stale index entry.
      this.forget(name)
      return null
    }
  }

  async set(key: string, format: OutputFormat, data: Buffer) {
    await this.ready
    const shard = key.slice(0, 2)
    const name = `${key}.${EXT[format]}`
    const file = path.join(this.cacheDir, shard, name)
    await this.ensureShard(shard)

    // Write to a unique temp file then atomically rename into place. A crash or
    // racing writers can't leave a torn image to be cached downstream forever.
    const tmp = `${file}.${randomUUID()}.tmp`
    try {
      await writeFile(tmp, data)
      await rename(tmp, file)
    } catch (err) {
      await unlink(tmp).catch(noop)
      throw err
    }

    const previous = this.index.get(name)
    if (previous) {
      this.totalBytes -= previous.size
      // A legacy flat-layout file for this key is now superseded by the shard.
      if (previous.path !== file) {
        await unlink(previous.path).catch(noop)
      }
    }
    const now = Date.now()
    this.index.set(name, {
      accessOrder: ++this.accessOrder,
      mtimeMs: now,
      path: file,
      size: data.byteLength,
    })
    this.totalBytes += data.byteLength

    await this.maybeEvict()
  }

  stats() {
    return {
      diskMaxBytes: this.maxBytes,
    }
  }

  async inspect() {
    await this.ready
    return {
      diskEvictedBytes: this.evictedBytes,
      diskEvictedFiles: this.evictedFiles,
      diskFileCount: this.index.size,
      diskLastEvictionAt: this.lastEvictionAt,
      diskMaxBytes: this.maxBytes,
      diskSizeBytes: this.totalBytes,
    }
  }

  async clear() {
    await this.ready
    const deletedBytes = this.totalBytes
    const deletedFiles = this.index.size

    const names = await readdir(this.cacheDir).catch(() => [])
    await Promise.all(
      names.map((name) =>
        rm(path.join(this.cacheDir, name), { force: true, recursive: true }),
      ),
    )

    this.index.clear()
    this.ensuredShards.clear()
    this.totalBytes = 0
    return { deletedBytes, deletedFiles }
  }

  private forget(name: string) {
    const entry = this.index.get(name)
    if (entry) {
      this.index.delete(name)
      this.totalBytes -= entry.size
    }
  }

  private async ensureShard(shard: string) {
    if (this.ensuredShards.has(shard)) {
      return
    }
    await mkdir(path.join(this.cacheDir, shard), { recursive: true })
    this.ensuredShards.add(shard)
  }

  /**
   * Read every cache file into the index, ordering access by mtime so the
   * coldest-written files evict first until live reads establish a real order.
   * Files are sharded one level deep by the first two key characters; any
   * legacy flat files are indexed in place and stay servable until evicted.
   */
  private async buildIndex() {
    const files = await this.scanDir()
    files.sort((a, b) => a.mtimeMs - b.mtimeMs)
    for (const file of files) {
      this.index.set(file.name, {
        accessOrder: ++this.accessOrder,
        mtimeMs: file.mtimeMs,
        path: file.path,
        size: file.size,
      })
      this.totalBytes += file.size
    }
    await this.maybeEvict()
  }

  private async scanDir() {
    const topLevel = await readdir(this.cacheDir, {
      withFileTypes: true,
    }).catch(() => [])

    const groups = await Promise.all(
      topLevel.map((entry) => {
        if (entry.isDirectory()) {
          this.ensuredShards.add(entry.name)
          const dir = path.join(this.cacheDir, entry.name)
          return readdir(dir)
            .catch(() => [])
            .then((names) =>
              Promise.all(
                names.map((name) => this.statFile(path.join(dir, name), name)),
              ),
            )
        }
        if (entry.isFile()) {
          return Promise.all([
            this.statFile(path.join(this.cacheDir, entry.name), entry.name),
          ])
        }
        return Promise.resolve([])
      }),
    )

    return groups.flat().filter((file): file is ScannedFile => file !== null)
  }

  private async statFile(file: string, name: string) {
    if (name.endsWith('.tmp')) {
      return null
    }
    try {
      const s = await stat(file)
      if (!s.isFile() || s.size === 0) {
        return null
      }
      return { mtimeMs: s.mtimeMs, name, path: file, size: s.size }
    } catch {
      return null
    }
  }

  private maybeEvict() {
    if (this.totalBytes <= this.maxBytes) {
      return Promise.resolve()
    }
    // Guard against overlapping sweeps: concurrent writes share the in-flight
    // eviction instead of each launching their own.
    if (!this.evicting) {
      this.evicting = this.evict().finally(() => {
        this.evicting = null
      })
    }
    return this.evicting
  }

  /**
   * Delete the least-recently-used entries (lowest access order) until back
   * under 90% of the cap. Walks the in-memory index, so it never scans disk.
   */
  private async evict() {
    const candidates = [...this.index.entries()].sort(
      (a, b) => a[1].accessOrder - b[1].accessOrder,
    )
    for (const [name, entry] of candidates) {
      if (this.totalBytes <= this.targetBytes) {
        break
      }
      await unlink(entry.path).catch(noop)
      this.forget(name)
      this.evictedFiles++
      this.evictedBytes += entry.size
      this.lastEvictionAt = Date.now()
    }
  }
}
