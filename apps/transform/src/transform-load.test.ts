import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleTransformRequest } from './transform'

const mocks = vi.hoisted(() => ({
  fetchOrigin: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
}))

vi.mock('@keenpix/transform', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@keenpix/transform')>()),
  assertSafeOrigin: vi.fn(),
  fetchOriginImage: mocks.fetchOrigin,
  transformImage: async () => ({ data: Buffer.from('rendered') }),
}))
vi.mock('@keenpix/cache', () => ({
  createTransformCache: () => ({
    buildKey: (input: { url: string }) => input.url,
    cacheControl: 'public',
    read: mocks.read,
    write: mocks.write,
  }),
}))
vi.mock('@keenpix/analytics', () => ({
  createRequestEventBuffer: () => ({ enqueue: vi.fn(), flush: vi.fn() }),
}))
vi.mock('@keenpix/database/image-measurement', () => ({
  createImageMeasurementBuffer: () => ({
    enqueue: vi.fn(),
    shutdown: vi.fn(),
  }),
}))
vi.mock('@keenpix/logger', () => ({
  createLogger: () => ({ error: vi.fn(), warn: vi.fn() }),
}))
vi.mock('./data-access', () => ({
  getTransformProject: async () => ({
    allowedOrigins: ['example.test'],
    autoFormat: true,
    defaultDpr: 1,
    defaultFit: 'cover',
    defaultQuality: 75,
    id: 'project',
    orgId: 'organization',
  }),
  orgCanServe: async () => true,
}))
vi.mock('./env', () => ({
  env: { KEENPIX_MODE: 'cloud', KEENPIX_APP_URL: 'https://keenpix.example' },
}))

function requestImage(name: string) {
  return handleTransformRequest(
    new Request('https://transform.example.test/img/source?project=project'),
    `https://example.test/${name}.jpg`,
  )
}

describe('image transform concurrency', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.fetchOrigin.mockResolvedValue(Buffer.from('origin'))
    mocks.read.mockResolvedValue(null)
    mocks.write.mockResolvedValue(undefined)
  })

  it('bounds distinct misses while still serving a cache hit and a duplicate', async () => {
    let resolveWrite: () => void = () => undefined
    const cacheWrite = new Promise<void>((resolve) => {
      resolveWrite = resolve
    })
    mocks.write.mockImplementation(() =>
      mocks.write.mock.calls.length <= 8 ? cacheWrite : Promise.resolve(),
    )
    const requests = Array.from({ length: 8 }, (_, i) =>
      requestImage(String(i)),
    )
    try {
      await vi.waitFor(() => expect(mocks.write).toHaveBeenCalledTimes(8))
      const duplicate = requestImage('0')
      await vi.waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(9))
      mocks.read.mockResolvedValueOnce({
        data: Buffer.from('cached'),
        originalBytes: 6,
        stale: true,
      })
      expect(await (await requestImage('cached')).text()).toBe('cached')
      const busy = await requestImage('overflow')
      expect(busy.status).toBe(503)
      expect(busy.headers.get('retry-after')).toBe('1')
      expect(mocks.fetchOrigin).toHaveBeenCalledTimes(8)
      resolveWrite()
      expect(await (await duplicate).text()).toBe('rendered')
      expect((await requestImage('overflow')).status).toBe(200)
    } finally {
      resolveWrite()
      await Promise.all(requests)
    }
  })
})
