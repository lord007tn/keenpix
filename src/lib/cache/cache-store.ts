import type { OutputFormat } from '@/shared/transform'

type CacheStoreResult<T> = Promise<T> | T

export interface CacheEntry {
  createdAt: number
  data: Buffer
}

export interface CacheStore {
  get(key: string, format: OutputFormat): CacheStoreResult<Buffer | null>
  getEntry(
    key: string,
    format: OutputFormat,
  ): CacheStoreResult<CacheEntry | null>
  set(key: string, format: OutputFormat, data: Buffer): CacheStoreResult<void>
  stats(): Record<string, number>
}
