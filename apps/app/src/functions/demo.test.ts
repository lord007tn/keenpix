import { readFile } from 'node:fs/promises'
import sharp from 'sharp'
import { describe, expect, it, vi } from 'vitest'
import { isCloud } from '@/server/deployment'
import { handleDemoRequest } from './demo'

const encodes = vi.hoisted(() => ({
  active: 0,
  hangNext: false,
  peak: 0,
  total: 0,
}))
vi.mock('@keenpix/transform/sharp', async (importOriginal) => {
  const engine =
    await importOriginal<typeof import('@keenpix/transform/sharp')>()
  return {
    transformImage: async (
      ...args: Parameters<typeof engine.transformImage>
    ) => {
      if (encodes.hangNext) {
        encodes.hangNext = false
        return new Promise<never>(() => undefined)
      }
      encodes.active++
      encodes.total++
      encodes.peak = Math.max(encodes.peak, encodes.active)
      try {
        return await engine.transformImage(...args)
      } finally {
        encodes.active--
      }
    },
  }
})
vi.mock('@/server/deployment', () => ({ isCloud: vi.fn(() => true) }))
vi.mock('@/lib/analytics-buffer/buffer', () => {
  throw new Error('Demo must not load analytics')
})
vi.mock('@/data-access/analytics-outbox', () => {
  throw new Error('Demo must not load outbox')
})
vi.mock('@/lib/billing/usage-reporter', () => {
  throw new Error('Demo must not load billing')
})
vi.mock('@keenpix/database/activation', () => {
  throw new Error('Demo must not load activation')
})
vi.mock('@/data-access/projects', () => {
  throw new Error('Demo must not load projects')
})
vi.mock('@/data-access/request-logs', () => {
  throw new Error('Demo must not load request logs')
})
vi.mock('@/lib/billing/service-gate', () => {
  throw new Error('Demo must not load entitlements')
})
const request = (query = 'fmt=webp&q=70&w=960', sample = 'og.png') =>
  handleDemoRequest(
    new Request(`https://keenpix.com/demo/img/${sample}?${query}`),
    sample,
  )

describe('bounded unmetered demo', () => {
  it('uses the real pipeline and canonical cache keys without network or customer modules', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('No network'))
    const response = await request()
    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(response.headers.get('cache-control')).toBe(
      'public, max-age=86400, no-transform',
    )
    expect(response.headers.get('x-robots-tag')).toBe('noindex')
    expect(response.headers.get('timing-allow-origin')).toBe('*')
    const bytes = Buffer.from(await response.arrayBuffer())
    const metadata = await sharp(bytes).metadata()
    expect(metadata).toMatchObject({ width: 960, height: 504, format: 'webp' })
    expect(response.headers.get('content-length')).toBe(String(bytes.length))
    expect((await request()).headers.get('x-keenpix-cache')).toBe('HIT')
    const source = await readFile(
      new URL('../../public/brand/keenpix-og.png', import.meta.url),
    )
    const original = await sharp(source).metadata()
    expect(original.width).toBe(1200)
    expect(original.height).toBe(630)
    expect(original.pages ?? 1).toBe(1)
    expect(response.headers.get('x-keenpix-original-bytes')).toBe(
      String(source.length),
    )
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
  it.each([
    '',
    'fmt=auto&q=70&w=960',
    'fmt=webp&q=70&w=961',
    'fmt=webp&q=71&w=960',
    'fmt=webp&q=70&w=960&url=https://example.com',
    'fmt=webp&fmt=jpeg&q=70&w=960',
    'w=960&q=70&fmt=webp',
    'fmt=webp&q=70&w=960&',
    '&fmt=webp&q=70&w=960',
    'fmt=webp&q=70&w=%39%36%30',
    'f%6dt=webp&q=70&w=960',
  ])('rejects invalid query %s', async (query) => {
    const response = await request(query)
    expect(response.status).toBe(400)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.text()).toContain(
      'Customer projects support the full parameter set:',
    )
  })
  it.each([
    'og.jpg',
    'missing.png',
    '../og.png',
    'https://example.com/og.png',
  ])('rejects sample %s', async (sample) => {
    expect((await request(undefined, sample)).status).toBe(400)
  })
  it.each([
    'https://keenpix.com/DEMO/img/og.png',
    'https://keenpix.com/demo/img/og.png/',
    'https://keenpix.com/demo/img/%6fg.png',
  ])('rejects the non-canonical path %s', async (url) => {
    const response = await handleDemoRequest(
      new Request(`${url}?fmt=webp&q=70&w=960`),
      'og.png',
    )
    expect(response.status).toBe(400)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
  it('frees the queue when an encode never finishes', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    encodes.hangNext = true
    const stuck = request('fmt=jpeg&q=85&w=640')
    const next = request('fmt=jpeg&q=85&w=960')
    await vi.advanceTimersByTimeAsync(30_000)
    vi.useRealTimers()
    expect((await stuck).status).toBe(500)
    expect((await next).status).toBe(200)
    expect((await request('fmt=jpeg&q=85&w=640')).status).toBe(200)
  })
  it('bounds a cold burst and coalesces identical variants', async () => {
    const before = encodes.total
    const responses = await Promise.all(
      Array.from({ length: 50 }, () => request('fmt=avif&q=85&w=1200')),
    )
    expect(encodes.total - before).toBe(1)
    expect(encodes.peak).toBe(1)
    expect(responses.filter((r) => r.status === 200)).toHaveLength(8)
    expect(responses.filter((r) => r.status === 503)).toHaveLength(42)
    expect(responses[49].headers.get('retry-after')).toBe('60')
    expect(responses[49].headers.get('cache-control')).toBe('no-store')
    expect(
      (await request('fmt=avif&q=85&w=1200')).headers.get('x-keenpix-cache'),
    ).toBe('HIT')
  })
  it('labels AVIF with the public format rather than sharp internal HEIF', async () => {
    const response = await request('fmt=avif&q=85&w=1200')
    expect(response.headers.get('content-type')).toBe('image/avif')
    expect(response.headers.get('x-keenpix-output-format')).toBe('avif')
    const metadata = await sharp(
      Buffer.from(await response.arrayBuffer()),
    ).metadata()
    expect(metadata.compression).toBe('av1')
  })
  it('serializes distinct cold encodes', async () => {
    encodes.peak = 0
    const responses = await Promise.all(
      ['jpeg', 'avif'].flatMap((fmt) =>
        [320, 640, 960, 1200].map((w) => request(`fmt=${fmt}&q=50&w=${w}`)),
      ),
    )
    expect(responses.every((response) => response.status === 200)).toBe(true)
    expect(encodes.peak).toBe(1)
  })
  it('is absent in self-host mode', async () => {
    vi.mocked(isCloud).mockReturnValueOnce(false)
    expect((await request()).status).toBe(404)
  })
})
