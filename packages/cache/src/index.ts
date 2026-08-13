import { createHash } from 'node:crypto'
import type { OutputFormat, TransformOptions } from '@keenpix/transform'
import type { CacheEntry, CacheStore } from './cache-store'
import { DiskCacheStore } from './disk-cache-store'
import { DragonflyCacheStore } from './dragonfly-cache-store'
import { MemoryCacheStore } from './memory-cache-store'
import { type ObjectCacheOptions, ObjectCacheStore } from './object-cache-store'

export interface CacheOptions {
  cacheControl: string
  deleteAfterMs?: number
  dir: string
  dragonflyMaxBytes?: number
  maxBytes: number
  memoryMaxBytes: number
  redisUrl?: string
  s3?: ObjectCacheOptions
  staleMs: number
}

export interface TransformKeyInput {
  projectId: string
  transformOptions: TransformOptions
  url: string
}

async function storeEntry(
  store: CacheStore,
  key: string,
  format: OutputFormat,
  entry: CacheEntry,
) {
  if (store.setEntry) {
    await store.setEntry(key, format, entry)
    return
  }
  await store.set(key, format, entry.data, entry.originalBytes)
}

export class KeenpixTierCoordinator {
  readonly cacheControl
  readonly tierNames
  private readonly disk
  private readonly memory
  private readonly options
  private readonly tiers: CacheStore[]

  constructor(options: CacheOptions) {
    this.options = options
    this.cacheControl = options.cacheControl
    this.disk = options.s3
      ? undefined
      : new DiskCacheStore(options.dir, options.maxBytes)
    this.memory = new MemoryCacheStore(options.memoryMaxBytes)
    this.tiers = [this.memory]
    if (options.redisUrl) {
      this.tiers.push(
        new DragonflyCacheStore(
          options.redisUrl,
          options.dragonflyMaxBytes ?? 512 * 1024 * 1024,
        ),
      )
    }
    if (options.s3) {
      this.tiers.push(new ObjectCacheStore(options.s3))
    } else if (this.disk) {
      // Local development remains useful without infrastructure. Docker and
      // Coolify always configure Dragonfly plus R2 or MaxIO.
      this.tiers.push(this.disk)
    }
    this.tierNames = this.tiers.map(
      (tier, index) => tier.name ?? `tier-${index}`,
    )
  }

  buildKey(input: TransformKeyInput) {
    return createHash('sha256').update(JSON.stringify(input)).digest('hex')
  }

  async read(key: string, format: OutputFormat) {
    for (const [index, tier] of this.tiers.entries()) {
      let entry: CacheEntry | null = null
      try {
        entry = await tier.getEntry(key, format)
      } catch {
        // A cache tier is an optimization, not the source of truth. Continue
        // down the chain so Dragonfly failure can fall through to R2/MaxIO.
        continue
      }
      if (!entry) {
        continue
      }
      if (
        this.options.deleteAfterMs &&
        this.options.deleteAfterMs > 0 &&
        Date.now() - entry.createdAt >= this.options.deleteAfterMs
      ) {
        await Promise.allSettled(
          this.tiers.map((candidate) => candidate.delete?.(key, format)),
        )
        return null
      }
      await Promise.allSettled(
        this.tiers
          .slice(0, index)
          .map((candidate) => storeEntry(candidate, key, format, entry)),
      )
      return {
        ...entry,
        stale:
          this.options.staleMs > 0 &&
          Date.now() - entry.createdAt >= this.options.staleMs,
        tier: tier.name ?? `tier-${index}`,
      }
    }
    return null
  }

  async write(
    key: string,
    format: OutputFormat,
    data: Buffer,
    originalBytes: number,
  ) {
    const entry = { createdAt: Date.now(), data, originalBytes }
    // Write durable tiers first. An upper-tier eviction can therefore always
    // fall through to a copy that already exists below it.
    const [durable, ...faster] = [...this.tiers].reverse()
    if (!durable) {
      return
    }
    await storeEntry(durable, key, format, entry)
    for (const tier of faster) {
      try {
        await storeEntry(tier, key, format, entry)
      } catch {
        // The durable copy is already safe. A failed hot-tier population can
        // recover through normal read promotion on the next request.
      }
    }
  }

  async probe() {
    const results = await Promise.allSettled(
      this.tiers
        .slice(1)
        .map(async (tier) => (tier.probe ? tier.probe() : true)),
    )
    return results.every(
      (result) => result.status === 'fulfilled' && result.value,
    )
  }

  async inspect() {
    return {
      ...(this.disk ? await this.disk.inspect() : {}),
      ...this.stats(),
    }
  }

  async clear(target: 'all' | 'disk' | 'memory') {
    const before = await this.inspect()
    let selected = this.tiers
    if (target === 'memory') {
      selected = [this.memory]
    } else if (target === 'disk') {
      selected = this.tiers.filter((tier) => tier.name !== 'memory')
    }
    const removed =
      this.disk && selected.includes(this.disk)
        ? await this.disk.clear()
        : { deletedBytes: 0, deletedFiles: 0 }
    await Promise.allSettled(
      selected
        .filter((tier) => tier !== this.disk)
        .map((tier) => tier.clear?.()),
    )
    return {
      after: await this.inspect(),
      before,
      deletedDiskBytes: removed.deletedBytes,
      deletedDiskFiles: removed.deletedFiles,
      target,
    }
  }

  limits() {
    return {
      diskMaxBytes: this.disk?.getMaxBytes() ?? this.options.maxBytes,
      memoryMaxBytes: this.memory.getMaxBytes(),
    }
  }

  applyLimits(input: { diskMaxBytes?: number; memoryMaxBytes?: number }) {
    if (
      this.disk &&
      input.diskMaxBytes != null &&
      input.diskMaxBytes !== this.disk.getMaxBytes()
    ) {
      this.disk.setMaxBytes(input.diskMaxBytes)
    }
    if (
      input.memoryMaxBytes != null &&
      input.memoryMaxBytes !== this.memory.getMaxBytes()
    ) {
      this.memory.setMaxBytes(input.memoryMaxBytes)
    }
  }

  stats() {
    return Object.assign(
      {
        cacheTierCount: this.tiers.length,
        cacheTiers: this.tierNames,
        diskMaxBytes: this.disk?.getMaxBytes() ?? this.options.maxBytes,
      },
      ...this.tiers.map((tier) => tier.stats()),
    )
  }
}

export function createTransformCache(options: CacheOptions) {
  return new KeenpixTierCoordinator(options)
}

export type TransformCache = ReturnType<typeof createTransformCache>
export type { CacheEntry, CacheStore } from './cache-store'
export { DiskCacheStore } from './disk-cache-store'
export { DragonflyCacheStore } from './dragonfly-cache-store'
export { MemoryCacheStore } from './memory-cache-store'
export { ObjectCacheStore } from './object-cache-store'
