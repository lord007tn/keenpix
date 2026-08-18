import type { OutputFormat } from '@keenpix/transform'

type CacheStoreResult<T> = Promise<T> | T

export interface CacheEntry {
  createdAt: number
  data: Buffer
  // Size of the origin original this variant was optimized from. Persisted with
  // the entry so a cache hit can book its compression saving (original − served)
  // without refetching the origin. 0 when unknown (e.g. a pre-existing file from
  // before this was tracked).
  originalBytes: number
}

export interface CacheStore {
  clear?(): CacheStoreResult<unknown>
  delete?(key: string, format: OutputFormat): CacheStoreResult<void>
  get(key: string, format: OutputFormat): CacheStoreResult<Buffer | null>
  getEntry(
    key: string,
    format: OutputFormat,
  ): CacheStoreResult<CacheEntry | null>
  readonly name?: string
  probe?(): Promise<boolean>
  set(
    key: string,
    format: OutputFormat,
    data: Buffer,
    originalBytes?: number,
  ): CacheStoreResult<void>
  setEntry?(
    key: string,
    format: OutputFormat,
    entry: CacheEntry,
  ): CacheStoreResult<void>
  stats(): Record<string, number>
}
