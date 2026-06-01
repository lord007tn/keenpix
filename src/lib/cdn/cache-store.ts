type CacheStoreResult<T> = Promise<T> | T

export interface CacheStore {
  get(key: string, fmt: string): CacheStoreResult<Buffer | null>
  set(key: string, fmt: string, data: Buffer): CacheStoreResult<void>
  stats(): Record<string, number>
}
