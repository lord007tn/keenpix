import { LRUCache } from 'lru-cache'
import type { OutputFormat } from '@/shared/transform'
import type { CacheEntry, CacheStore } from './cache-store'

function memoryKey(key: string, format: OutputFormat) {
  return `${key}.${format}`
}

export class MemoryCacheStore implements CacheStore {
  private cache
  private maxBytes

  constructor(maxBytes: number) {
    this.maxBytes = maxBytes
    this.cache = MemoryCacheStore.build(maxBytes)
  }

  private static build(maxBytes: number) {
    return maxBytes > 0
      ? new LRUCache<string, CacheEntry>({
          maxSize: maxBytes,
          sizeCalculation: (value) => value.data.byteLength,
        })
      : null
  }

  getMaxBytes() {
    return this.maxBytes
  }

  // LRU maxSize is fixed at construction, so a new cap rebuilds the store. Hot
  // items are dropped — acceptable for a cache and infrequent (admin action).
  setMaxBytes(bytes: number) {
    this.maxBytes = bytes
    this.cache = MemoryCacheStore.build(bytes)
  }

  get(key: string, format: OutputFormat) {
    return this.getEntry(key, format)?.data ?? null
  }

  getEntry(key: string, format: OutputFormat) {
    return this.cache?.get(memoryKey(key, format)) ?? null
  }

  set(key: string, format: OutputFormat, data: Buffer, originalBytes = 0) {
    this.cache?.set(memoryKey(key, format), {
      createdAt: Date.now(),
      data,
      originalBytes,
    })
  }

  setEntry(key: string, format: OutputFormat, entry: CacheEntry) {
    this.cache?.set(memoryKey(key, format), entry)
  }

  clear() {
    this.cache?.clear()
  }

  stats() {
    return {
      memoryItemCount: this.cache?.size ?? 0,
      memoryMaxBytes: this.maxBytes,
      memorySizeBytes: this.cache?.calculatedSize ?? 0,
    }
  }
}
