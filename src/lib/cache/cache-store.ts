import type { OutputFormat } from '@/shared/transform'

type CacheStoreResult<T> = Promise<T> | T

export interface CacheStore {
  get(key: string, format: OutputFormat): CacheStoreResult<Buffer | null>
  set(key: string, format: OutputFormat, data: Buffer): CacheStoreResult<void>
  stats(): Record<string, number>
}
