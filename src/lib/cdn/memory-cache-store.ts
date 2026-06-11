import { LRUCache } from 'lru-cache'
import type { CacheStore } from './cache-store'

function memoryKey(key: string, fmt: string) {
  return `${key}.${fmt}`
}

export class MemoryCacheStore implements CacheStore {
  private readonly cache
  private readonly maxBytes

  constructor(maxBytes: number) {
    this.maxBytes = maxBytes
    this.cache =
      maxBytes > 0
        ? new LRUCache<string, Buffer>({
            maxSize: maxBytes,
            sizeCalculation: (value) => value.byteLength,
          })
        : null
  }

  get(key: string, fmt: string) {
    return this.cache?.get(memoryKey(key, fmt)) ?? null
  }

  set(key: string, fmt: string, data: Buffer) {
    this.cache?.set(memoryKey(key, fmt), data)
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
