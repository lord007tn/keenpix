import { mkdtemp, readdir, rm, stat, utimes } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildCacheKey, cacheControl } from './cache'
import { DiskCacheStore } from './disk-cache-store'
import { MemoryCacheStore } from './memory-cache-store'

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

  it('preserves mtime as the refresh timestamp when reading', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'keenpix-cache-'))
    const store = new DiskCacheStore(dir, 1024)
    const data = Buffer.from('image-bytes')

    try {
      await store.set('key', 'webp', data)
      const file = path.join(dir, 'key.webp')
      const written = new Date(Date.now() - 60_000)
      await utimes(file, written, written)

      const entry = await store.getEntry('key', 'webp')
      const after = await stat(file)

      expect(entry?.data).toEqual(data)
      expect(Math.round(entry?.createdAt ?? 0)).toBe(
        Math.round(written.getTime()),
      )
      expect(Math.round(after.mtimeMs)).toBe(Math.round(written.getTime()))
      expect(after.atimeMs).toBeGreaterThan(written.getTime())
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
