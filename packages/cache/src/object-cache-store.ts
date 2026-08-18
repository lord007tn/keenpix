import type { OutputFormat } from '@keenpix/transform'
import { createStorage } from 'unstorage'
import s3Driver from 'unstorage/drivers/s3'
import type { CacheEntry, CacheStore } from './cache-store'
import { decodeCacheEntry, encodeCacheEntry } from './entry-codec'

function entryKey(key: string, format: OutputFormat) {
  return `${key}.${format}`
}

export interface ObjectCacheOptions {
  accessKeyId: string
  bucket: string
  endpoint: string
  region?: string
  secretAccessKey: string
}

export class ObjectCacheStore implements CacheStore {
  readonly name = 'object'
  private readonly storage

  constructor(options: ObjectCacheOptions) {
    this.storage = createStorage({
      driver: s3Driver({
        accessKeyId: options.accessKeyId,
        bucket: options.bucket,
        endpoint: options.endpoint,
        region: options.region ?? 'auto',
        secretAccessKey: options.secretAccessKey,
      }),
    })
  }

  async get(key: string, format: OutputFormat) {
    return (await this.getEntry(key, format))?.data ?? null
  }

  async getEntry(key: string, format: OutputFormat) {
    return decodeCacheEntry(
      await this.storage.getItemRaw(entryKey(key, format)),
    )
  }

  set(key: string, format: OutputFormat, data: Buffer, originalBytes = 0) {
    return this.setEntry(key, format, {
      createdAt: Date.now(),
      data,
      originalBytes,
    })
  }

  async setEntry(key: string, format: OutputFormat, entry: CacheEntry) {
    await this.storage.setItemRaw(
      entryKey(key, format),
      encodeCacheEntry(entry),
    )
  }

  async delete(key: string, format: OutputFormat) {
    await this.storage.removeItem(entryKey(key, format))
  }

  async clear() {
    await this.storage.clear()
  }

  async probe() {
    const key = `.health.${process.pid}`
    const data = Buffer.from('ok')
    await this.set(key, 'jpeg', data, data.byteLength)
    const found = await this.getEntry(key, 'jpeg')
    await this.delete(key, 'jpeg')
    return Boolean(found)
  }

  stats() {
    return { objectCache: 1 }
  }
}
