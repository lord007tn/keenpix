import type { OutputFormat } from '@keenpix/transform'
import Redis from 'ioredis'
import type { CacheEntry, CacheStore } from './cache-store'
import { decodeCacheEntry, encodeCacheEntry } from './entry-codec'

const WRITE_ENTRY_SCRIPT = `
local previous = tonumber(redis.call('HGET', KEYS[2], ARGV[1]) or '0')
redis.call('SET', KEYS[1], ARGV[2])
redis.call('HSET', KEYS[2], ARGV[1], ARGV[3])
redis.call('ZADD', KEYS[3], ARGV[4], ARGV[1])
local total = tonumber(redis.call('GET', KEYS[4]) or '0') - previous + tonumber(ARGV[3])
redis.call('SET', KEYS[4], total)
return total
`

const DELETE_ENTRY_SCRIPT = `
local size = tonumber(redis.call('HGET', KEYS[2], ARGV[1]) or '0')
redis.call('DEL', KEYS[1])
redis.call('HDEL', KEYS[2], ARGV[1])
redis.call('ZREM', KEYS[3], ARGV[1])
local total = math.max(0, tonumber(redis.call('GET', KEYS[4]) or '0') - size)
redis.call('SET', KEYS[4], total)
return total
`

function entryName(key: string, format: OutputFormat) {
  return `${key}.${format}`
}

export class DragonflyCacheStore implements CacheStore {
  readonly name = 'dragonfly'
  private readonly redis
  private readonly base
  private readonly maxBytes

  constructor(url: string, maxBytes: number, base = 'keenpix:variant-cache') {
    this.redis = new Redis(url, {
      enableReadyCheck: true,
      maxRetriesPerRequest: 1,
    })
    this.base = base
    this.maxBytes = maxBytes
  }

  private dataKey(name: string) {
    return `${this.base}:entry:${name}`
  }

  private get sizesKey() {
    return `${this.base}:sizes`
  }

  private get lruKey() {
    return `${this.base}:lru`
  }

  private get totalKey() {
    return `${this.base}:bytes`
  }

  async get(key: string, format: OutputFormat) {
    return (await this.getEntry(key, format))?.data ?? null
  }

  async getEntry(key: string, format: OutputFormat) {
    const name = entryName(key, format)
    const raw = await this.redis.getBuffer(this.dataKey(name))
    const entry = decodeCacheEntry(raw)
    if (entry) {
      await this.redis.zadd(this.lruKey, Date.now(), name)
    }
    return entry
  }

  set(key: string, format: OutputFormat, data: Buffer, originalBytes = 0) {
    return this.setEntry(key, format, {
      createdAt: Date.now(),
      data,
      originalBytes,
    })
  }

  async setEntry(key: string, format: OutputFormat, entry: CacheEntry) {
    const name = entryName(key, format)
    const encoded = encodeCacheEntry(entry)
    await this.redis.eval(
      WRITE_ENTRY_SCRIPT,
      4,
      this.dataKey(name),
      this.sizesKey,
      this.lruKey,
      this.totalKey,
      name,
      encoded,
      encoded.byteLength,
      Date.now(),
    )
    await this.enforceLimit()
  }

  private async enforceLimit() {
    if (this.maxBytes <= 0) {
      return
    }
    let total = Number((await this.redis.get(this.totalKey)) ?? 0)
    while (total > this.maxBytes) {
      const [oldest] = await this.redis.zrange(this.lruKey, 0, 0)
      if (!oldest) {
        break
      }
      total = Number(
        await this.redis.eval(
          DELETE_ENTRY_SCRIPT,
          4,
          this.dataKey(oldest),
          this.sizesKey,
          this.lruKey,
          this.totalKey,
          oldest,
        ),
      )
    }
  }

  async delete(key: string, format: OutputFormat) {
    const name = entryName(key, format)
    await this.redis.eval(
      DELETE_ENTRY_SCRIPT,
      4,
      this.dataKey(name),
      this.sizesKey,
      this.lruKey,
      this.totalKey,
      name,
    )
  }

  async clear() {
    const names = await this.redis.zrange(this.lruKey, 0, -1)
    const keys = names.map((name) => this.dataKey(name))
    if (keys.length) {
      await this.redis.del(...keys)
    }
    await this.redis.del(this.sizesKey, this.lruKey, this.totalKey)
  }

  async probe() {
    return (await this.redis.ping()) === 'PONG'
  }

  stats() {
    return { dragonflyMaxBytes: this.maxBytes }
  }
}
