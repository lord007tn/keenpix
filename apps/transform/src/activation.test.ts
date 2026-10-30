import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  record: vi.fn(),
  cache: vi.fn(),
  project: vi.fn(),
  enqueue: vi.fn(),
  warn: vi.fn(),
}))
vi.mock('@keenpix/database/activation', () => ({
  recordProjectFirstImageSuccesses: mocks.record,
}))
vi.mock('@keenpix/database', () => ({
  measurementPrisma: { $executeRaw: vi.fn(), $disconnect: vi.fn() },
}))
vi.mock('@keenpix/analytics', () => ({
  createRequestEventBuffer: () => ({ enqueue: mocks.enqueue, flush: vi.fn() }),
}))
vi.mock('@keenpix/cache', () => ({
  createTransformCache: () => ({
    read: mocks.cache,
    buildKey: () => 'cache-key',
    write: vi.fn(),
    cacheControl: 'public',
  }),
}))
vi.mock('@keenpix/logger', () => ({
  createLogger: () => ({ warn: mocks.warn, error: vi.fn() }),
}))
vi.mock('./data-access', () => ({
  getTransformProject: mocks.project,
  orgCanServe: () => true,
  getProjectIdByCustomHostname: () => 'project',
}))
vi.mock('./env', () => ({
  env: { KEENPIX_MODE: 'cloud', KEENPIX_APP_URL: 'https://keenpix.com' },
}))

import { handleTransformRequest, optimizeProjectImage } from './transform'

describe('standalone transform first-image capture', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.project.mockResolvedValue({
      id: 'project',
      orgId: 'organization',
      allowedOrigins: ['example.test'],
      autoFormat: true,
      defaultQuality: 75,
      defaultDpr: 1,
      defaultFit: 'cover',
    })
    mocks.cache.mockResolvedValue({
      data: Buffer.from('image'),
      originalBytes: 10,
    })
    mocks.record.mockResolvedValue(1)
  })

  it('records an eligible nonempty GET and binds the resolved project owner', async () => {
    const response = await handleTransformRequest(
      new Request(
        'https://images.customer.test/img/https%3A%2F%2Fexample.test%2Fimage.jpg?project=project',
      ),
      'https://example.test/image.jpg',
    )
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('image')
    await vi.waitFor(() => expect(mocks.record).toHaveBeenCalledTimes(1))
    expect(mocks.record).toHaveBeenCalledWith(
      [
        {
          projectId: 'project',
          orgId: 'organization',
          external: true,
          observedAt: expect.any(Date),
        },
      ],
      expect.anything(),
    )
  })

  it.each([
    'https://keenpix.com/sample.jpg',
    'https://cdn.keenpix.com/sample.jpg',
    'https://CDN.KeenPix.com./sample.jpg',
  ])('keeps the v1 capture but marks %s as not external', async (source) => {
    mocks.project.mockResolvedValue({
      id: 'project',
      orgId: 'organization',
      allowedOrigins: ['keenpix.com', 'cdn.keenpix.com', 'cdn.keenpix.com.'],
      autoFormat: true,
      defaultQuality: 75,
      defaultDpr: 1,
      defaultFit: 'cover',
    })
    const response = await handleTransformRequest(
      new Request('https://images.customer.test/img/source?project=project'),
      source,
    )
    expect(response.status).toBe(200)
    await vi.waitFor(() => expect(mocks.record).toHaveBeenCalledTimes(1))
    expect(mocks.record).toHaveBeenCalledWith(
      [
        {
          projectId: 'project',
          orgId: 'organization',
          external: false,
          observedAt: expect.any(Date),
        },
      ],
      expect.anything(),
    )
  })

  it('serves and accounts before a stalled capture completes', async () => {
    let release: (value: number) => void = () => undefined
    mocks.record.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve
      }),
    )
    const pending = handleTransformRequest(
      new Request('https://images.customer.test/img/source?project=project'),
      'https://example.test/image.jpg',
    )
    await vi.waitFor(() => expect(mocks.record).toHaveBeenCalledTimes(1))
    expect((await pending).status).toBe(200)
    expect(mocks.enqueue).toHaveBeenCalledTimes(1)
    release(0)
    expect((await pending).status).toBe(200)
    await vi.waitFor(() => expect(mocks.record).toHaveBeenCalledTimes(1))
    expect(mocks.enqueue).toHaveBeenCalledTimes(1)
  })

  it.each([
    { method: 'HEAD' },
    { headers: new Headers({ 'x-keenpix-request-purpose': 'preview' }) },
    { headers: new Headers({ purpose: 'prefetch' }) },
  ])('excludes non-delivery work %j', async (init) => {
    const response = await handleTransformRequest(
      new Request(
        'https://images.customer.test/img/source?project=project',
        init,
      ),
      'https://example.test/image.jpg',
    )
    expect(response.status).toBe(200)
    expect(mocks.record).not.toHaveBeenCalled()
    if (init.method === 'HEAD') {
      expect(await response.text()).toBe('')
    }
  })

  it('still queries eligibility for unclassified workspaces and serves when no row qualifies', async () => {
    mocks.record.mockResolvedValueOnce(0)
    const response = await handleTransformRequest(
      new Request('https://images.customer.test/img/source?project=project'),
      'https://example.test/image.jpg',
    )
    expect(response.status).toBe(200)
    await vi.waitFor(() => expect(mocks.record).toHaveBeenCalledTimes(1))
    expect(mocks.enqueue).toHaveBeenCalledTimes(1)
  })

  it('excludes authenticated prewarm even if an internal caller sets the candidate flag', async () => {
    await optimizeProjectImage({
      accept: 'image/webp',
      projectId: 'project',
      recordLog: false,
      recordActivation: true,
      trusted: true,
      searchParams: new URLSearchParams(),
      src: 'https://example.test/image.jpg',
    })
    expect(mocks.record).not.toHaveBeenCalled()
    expect(mocks.enqueue).not.toHaveBeenCalled()
  })

  it('serves and accounts when capture fails and logs no internals', async () => {
    mocks.record.mockRejectedValueOnce(new Error('Synthetic ledger failure'))
    const response = await handleTransformRequest(
      new Request('https://images.customer.test/img/source?project=project'),
      'https://example.test/image.jpg',
    )
    expect(response.status).toBe(200)
    expect(mocks.enqueue).toHaveBeenCalledTimes(1)
    expect(await response.text()).toBe('image')
    await vi.waitFor(() =>
      expect(mocks.warn).toHaveBeenCalledWith('image measurement interrupted'),
    )
    expect(JSON.stringify(mocks.warn.mock.calls)).not.toContain(
      'Synthetic ledger failure',
    )
    const retry = await handleTransformRequest(
      new Request('https://images.customer.test/img/source?project=project'),
      'https://example.test/image.jpg',
    )
    expect(retry.status).toBe(200)
    expect(await retry.text()).toBe('image')
    await vi.waitFor(() => expect(mocks.record).toHaveBeenCalledTimes(2))
    expect(mocks.enqueue).toHaveBeenCalledTimes(2)
    expect(mocks.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ status: 200, bytesOut: 5 }),
    )
  })
})
