import { LRUCache } from 'lru-cache'
import type { OutputFormat } from '@/shared/transform'
import type { CacheEntry, CacheStore } from './cache-store'

function memoryKey(key: string, format: OutputFormat) {
  return `${key}.${format}`
}

export class MemoryCacheStore implements CacheStore {
  private readonly cache
  private readonly maxBytes

  constructor(maxBytes: number) {
    this.maxBytes = maxBytes
    this.cache =
      maxBytes > 0
        ? new LRUCache<string, CacheEntry>({
            maxSize: maxBytes,
            sizeCalculation: (value) => value.data.byteLength,
          })
        : null
  }

  get(key: string, format: OutputFormat) {
    return this.getEntry(key, format)?.data ?? null
  }

  getEntry(key: string, format: OutputFormat) {
    return this.cache?.get(memoryKey(key, format)) ?? null
  }

  set(key: string, format: OutputFormat, data: Buffer) {
    this.cache?.set(memoryKey(key, format), { createdAt: Date.now(), data })
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
