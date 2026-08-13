import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { DiskCacheStore } from './disk-cache-store'
import { createTransformCache } from './index'
import { MemoryCacheStore } from './memory-cache-store'

const cache = createTransformCache({
  cacheControl: 'public, max-age=31536000, immutable',
  dir: path.join(tmpdir(), 'keenpix-cache-tests'),
  maxBytes: 1024,
  memoryMaxBytes: 1024,
  staleMs: 60_000,
})
const buildCacheKey = cache.buildKey
const cacheControl = () => cache.cacheControl

const SHA256_HEX = /^[0-9a-f]{64}$/
const base = {
  projectId: 'store',
  url: 'https://cdn.example.com/a.png',
  transformOptions: {
    fit: 'cover' as const,
    format: 'webp' as const,
    quality: 75,
  },
}

describe('buildCacheKey', () => {
  it('is a stable 64-char hex digest', () => {
    const key = buildCacheKey(base)
    expect(key).toMatch(SHA256_HEX)
    expect(buildCacheKey(base)).toBe(key)
  })

  it('changes when any transform parameter changes', () => {
    const key = buildCacheKey(base)
    expect(
      buildCacheKey({
        ...base,
        transformOptions: { ...base.transformOptions, width: 400 },
      }),
    ).not.toBe(key)
    expect(
      buildCacheKey({
        ...base,
        transformOptions: { ...base.transformOptions, format: 'avif' },
      }),
    ).not.toBe(key)
    expect(buildCacheKey({ ...base, projectId: 'blog' })).not.toBe(key)
    expect(
      buildCacheKey({
        ...base,
        transformOptions: { ...base.transformOptions, quality: 80 },
      }),
    ).not.toBe(key)
    expect(
      buildCacheKey({
        ...base,
        transformOptions: {
          ...base.transformOptions,
          background: '#ffffff',
          flatten: true,
        },
      }),
    ).not.toBe(key)
    expect(
      buildCacheKey({ ...base, url: 'https://cdn.example.com/b.png' }),
    ).not.toBe(key)
  })
})

describe('cacheControl', () => {
  it('is long-lived + immutable so a CDN can cache the response', () => {
    expect(cacheControl()).toBe('public, max-age=31536000, immutable')
  })
})

describe('MemoryCacheStore', () => {
  it('stores raw image bytes within the configured byte budget', async () => {
    const store = new MemoryCacheStore(1024)
    const data = Buffer.from('image-bytes')

    await store.set('key', 'webp', data)

    expect(await store.get('key', 'webp')).toEqual(data)
    expect(store.stats()).toMatchObject({
      memoryItemCount: 1,
      memoryMaxBytes: 1024,
      memorySizeBytes: data.byteLength,
    })
  })

  it('can be disabled with a zero byte budget', async () => {
    const store = new MemoryCacheStore(0)

    await store.set('key', 'webp', Buffer.from('image-bytes'))

    expect(await store.get('key', 'webp')).toBeNull()
    expect(store.stats()).toMatchObject({
      memoryItemCount: 0,
      memoryMaxBytes: 0,
      memorySizeBytes: 0,
    })
  })

  it('clears stored entries', async () => {
    const store = new MemoryCacheStore(1024)
    await store.set('key', 'webp', Buffer.from('image-bytes'))

    store.clear()

    expect(await store.get('key', 'webp')).toBeNull()
    expect(store.stats()).toMatchObject({
      memoryItemCount: 0,
      memorySizeBytes: 0,
    })
  })
})

describe('DiskCacheStore', () => {
  it('persists raw image bytes by key and format', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'keenpix-cache-'))
    const store = new DiskCacheStore(dir, 1024)
    const data = Buffer.from('image-bytes')

    try {
      await store.set('key', 'webp', data)

      expect(await store.get('key', 'webp')).toEqual(data)
      expect(await store.get('key', 'avif')).toBeNull()
      expect(store.stats()).toEqual({ diskMaxBytes: 1024 })
    } finally {
      await rm(dir, { force: true, recursive: true })
    }
  })

  it('reports the write time as the entry createdAt', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'keenpix-cache-'))
    const store = new DiskCacheStore(dir, 1024)
    const data = Buffer.from('image-bytes')

    try {
      const before = Date.now()
      await store.set('key', 'webp', data)

      const entry = await store.getEntry('key', 'webp')
      expect(entry?.data).toEqual(data)
      expect(entry?.createdAt).toBeGreaterThanOrEqual(before)
    } finally {
      await rm(dir, { force: true, recursive: true })
    }
  })

  it('rebuilds its index from files already on disk', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'keenpix-cache-'))
    const data = Buffer.from('image-bytes')

    try {
      const first = new DiskCacheStore(dir, 1024)
      await first.set('key', 'webp', data)

      const second = new DiskCacheStore(dir, 1024)
      expect(await second.get('key', 'webp')).toEqual(data)
      expect(await second.inspect()).toMatchObject({
        diskFileCount: 1,
        diskSizeBytes: data.byteLength,
      })
    } finally {
      await rm(dir, { force: true, recursive: true })
    }
  })

  it('round-trips the origin original size, surviving an index rebuild', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'keenpix-cache-'))
    const data = Buffer.from('optimized-bytes')

    try {
      const first = new DiskCacheStore(dir, 1024)
      await first.set('key', 'webp', data, 5000)
      expect((await first.getEntry('key', 'webp'))?.originalBytes).toBe(5000)

      // A fresh store rebuilds the index from disk; the size must survive.
      const second = new DiskCacheStore(dir, 1024)
      const entry = await second.getEntry('key', 'webp')
      expect(entry?.data).toEqual(data)
      expect(entry?.originalBytes).toBe(5000)
    } finally {
      await rm(dir, { force: true, recursive: true })
    }
  })

  it('evicts the least-recently-used entries when over the cap', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'keenpix-cache-'))
    const data = Buffer.alloc(100, 1)
    // Cap fits two 100-byte entries; a third forces eviction back under 90%.
    const store = new DiskCacheStore(dir, 250)

    try {
      await store.set('aa', 'webp', data)
      await store.set('bb', 'webp', data)
      // Touch 'aa' so 'bb' is the coldest entry when the cap is exceeded.
      await store.get('aa', 'webp')
      await store.set('cc', 'webp', data)

      expect(await store.get('bb', 'webp')).toBeNull()
      expect(await store.get('aa', 'webp')).toEqual(data)
      expect(await store.get('cc', 'webp')).toEqual(data)
      expect(await store.inspect()).toMatchObject({
        diskEvictedBytes: 100,
        diskEvictedFiles: 1,
        diskFileCount: 2,
      })
    } finally {
      await rm(dir, { force: true, recursive: true })
    }
  })

  it('clears cache files and reports deleted bytes', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'keenpix-cache-'))
    const store = new DiskCacheStore(dir, 1024)
    const data = Buffer.from('image-bytes')

    try {
      await store.set('key', 'webp', data)

      const result = await store.clear()

      expect(result).toEqual({
        deletedBytes: data.byteLength,
        deletedFiles: 1,
      })
      expect(await readdir(dir)).toEqual([])
      expect(await store.get('key', 'webp')).toBeNull()
    } finally {
      await rm(dir, { force: true, recursive: true })
    }
  })
})
