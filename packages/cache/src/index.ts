import { createHash } from 'node:crypto'
import type { OutputFormat, TransformOptions } from '@keenpix/transform'
import { createStorage } from 'unstorage'
import redisDriver from 'unstorage/drivers/redis'
import s3Driver from 'unstorage/drivers/s3'
import type { CacheStore as CacheStoreValue } from './cache-store'
import { DiskCacheStore as DiskCache } from './disk-cache-store'
import { MemoryCacheStore as MemoryCache } from './memory-cache-store'

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
const METADATA_BYTES = 16

export interface CacheOptions {
  cacheControl: string
  dir: string
  maxBytes: number
  memoryMaxBytes: number
  redisUrl?: string
  s3?: {
    accessKeyId: string
    bucket: string
    endpoint: string
    region?: string
    secretAccessKey: string
  }
  staleMs: number
}

export interface TransformKeyInput {
  projectId: string
  transformOptions: TransformOptions
  url: string
}

function entryKey(key: string, format: OutputFormat) {
  return `${key}.${EXT[format]}`
}

function createUnstorageStore(
  options: CacheOptions,
): CacheStoreValue | undefined {
  let storage = options.s3
    ? createStorage({
        driver: s3Driver({
          accessKeyId: options.s3.accessKeyId,
          bucket: options.s3.bucket,
          endpoint: options.s3.endpoint,
          region: options.s3.region ?? 'auto',
          secretAccessKey: options.s3.secretAccessKey,
        }),
      })
    : undefined
  if (!storage && options.redisUrl) {
    storage = createStorage({
      driver: redisDriver({
        base: 'keenpix:transform-cache',
        url: options.redisUrl,
      }),
    })
  }

  if (!storage) {
    return
  }

  return {
    async get(key, format) {
      return (await this.getEntry(key, format))?.data ?? null
    },
    async getEntry(key, format) {
      const cacheKey = entryKey(key, format)
      const raw = await storage.getItemRaw(cacheKey)
      if (!(raw && raw.byteLength > METADATA_BYTES)) {
        return null
      }
      const bytes = Buffer.from(raw as Uint8Array)
      return {
        createdAt: Number(bytes.readBigUInt64BE(0)),
        data: bytes.subarray(METADATA_BYTES),
        originalBytes: Number(bytes.readBigUInt64BE(8)),
      }
    },
    async set(key, format, data, originalBytes = 0) {
      const bytes = Buffer.allocUnsafe(METADATA_BYTES + data.byteLength)
      bytes.writeBigUInt64BE(BigInt(Date.now()), 0)
      bytes.writeBigUInt64BE(BigInt(originalBytes), 8)
      data.copy(bytes, METADATA_BYTES)
      await storage.setItemRaw(entryKey(key, format), bytes)
    },
    stats() {
      return { sharedCache: 1 }
    },
  }
}

export function createTransformCache(options: CacheOptions) {
  const memory = new MemoryCache(options.memoryMaxBytes)
  const disk = new DiskCache(options.dir, options.maxBytes)
  const durable = createUnstorageStore(options) ?? disk

  return {
    cacheControl: options.cacheControl,
    buildKey(input: TransformKeyInput) {
      return createHash('sha256').update(JSON.stringify(input)).digest('hex')
    },
    async read(key: string, format: OutputFormat) {
      const hot = await memory.getEntry(key, format)
      if (hot) {
        return {
          ...hot,
          stale:
            options.staleMs > 0 &&
            Date.now() - hot.createdAt >= options.staleMs,
        }
      }
      const entry = await durable.getEntry(key, format)
      if (!entry) {
        return null
      }
      memory.setEntry(key, format, entry)
      return {
        ...entry,
        stale:
          options.staleMs > 0 &&
          Date.now() - entry.createdAt >= options.staleMs,
      }
    },
    async write(
      key: string,
      format: OutputFormat,
      data: Buffer,
      originalBytes: number,
    ) {
      await durable.set(key, format, data, originalBytes)
      memory.set(key, format, data, originalBytes)
    },
    async probe() {
      const key = `.health.${process.pid}`
      try {
        const data = Buffer.from('ok')
        await durable.set(key, 'jpeg', data, data.byteLength)
        return Boolean(await durable.getEntry(key, 'jpeg'))
      } catch {
        return false
      }
    },
    async inspect() {
      return { ...(await disk.inspect()), ...memory.stats() }
    },
    async clear(target: 'all' | 'disk' | 'memory') {
      const before = { ...(await disk.inspect()), ...memory.stats() }
      const removed =
        target === 'disk' || target === 'all'
          ? await disk.clear()
          : { deletedBytes: 0, deletedFiles: 0 }
      if (target === 'memory' || target === 'all') {
        memory.clear()
      }
      return {
        after: { ...(await disk.inspect()), ...memory.stats() },
        before,
        deletedDiskBytes: removed.deletedBytes,
        deletedDiskFiles: removed.deletedFiles,
        target,
      }
    },
    limits() {
      return {
        diskMaxBytes: disk.getMaxBytes(),
        memoryMaxBytes: memory.getMaxBytes(),
      }
    },
    applyLimits(input: { diskMaxBytes?: number; memoryMaxBytes?: number }) {
      if (
        input.diskMaxBytes != null &&
        input.diskMaxBytes !== disk.getMaxBytes()
      ) {
        disk.setMaxBytes(input.diskMaxBytes)
      }
      if (
        input.memoryMaxBytes != null &&
        input.memoryMaxBytes !== memory.getMaxBytes()
      ) {
        memory.setMaxBytes(input.memoryMaxBytes)
      }
    },
    stats() {
      return { ...disk.stats(), ...durable.stats(), ...memory.stats() }
    },
  }
}

export type TransformCache = ReturnType<typeof createTransformCache>
export type { CacheEntry, CacheStore } from './cache-store'
export { DiskCacheStore } from './disk-cache-store'
export { MemoryCacheStore } from './memory-cache-store'
