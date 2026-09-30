import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  record: vi.fn(),
  cache: vi.fn(),
  project: vi.fn(),
  enqueue: vi.fn(),
}))
vi.mock('@keenpix/database/activation', () => ({
  recordProjectFirstImageSuccesses: mocks.record,
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
  createLogger: () => ({ warn: vi.fn(), error: vi.fn() }),
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
    expect(mocks.record).toHaveBeenCalledExactlyOnceWith([
      {
        projectId: 'project',
        orgId: 'organization',
      },
    ])
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
    expect(mocks.record).toHaveBeenCalledTimes(1)
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

  it('fails before accounting when durability fails, then accounts one successful retry', async () => {
    mocks.record.mockRejectedValueOnce(new Error('Synthetic ledger failure'))
    const response = await handleTransformRequest(
      new Request('https://images.customer.test/img/source?project=project'),
      'https://example.test/image.jpg',
    )
    expect(response.status).toBe(500)
    expect(mocks.enqueue).not.toHaveBeenCalled()
    expect(await response.text()).not.toContain('Synthetic ledger failure')
    const retry = await handleTransformRequest(
      new Request('https://images.customer.test/img/source?project=project'),
      'https://example.test/image.jpg',
    )
    expect(retry.status).toBe(200)
    expect(await retry.text()).toBe('image')
    expect(mocks.record).toHaveBeenCalledTimes(2)
    expect(mocks.enqueue).toHaveBeenCalledTimes(1)
    expect(mocks.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ status: 200, bytesOut: 5 }),
    )
  })
})
