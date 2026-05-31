import { describe, expect, it } from 'vitest'
import { buildCacheKey, cacheControl } from './cache'

const SHA256_HEX = /^[0-9a-f]{64}$/
const base = {
  projectId: 'store',
  url: 'https://cdn.example.com/a.png',
  fmt: 'webp',
  fit: 'cover',
  q: 75,
}

describe('buildCacheKey', () => {
  it('is a stable 64-char hex digest', () => {
    const key = buildCacheKey(base)
    expect(key).toMatch(SHA256_HEX)
    expect(buildCacheKey(base)).toBe(key)
  })

  it('changes when any transform parameter changes', () => {
    const key = buildCacheKey(base)
    expect(buildCacheKey({ ...base, w: 400 })).not.toBe(key)
    expect(buildCacheKey({ ...base, fmt: 'avif' })).not.toBe(key)
    expect(buildCacheKey({ ...base, projectId: 'blog' })).not.toBe(key)
    expect(buildCacheKey({ ...base, q: 80 })).not.toBe(key)
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
