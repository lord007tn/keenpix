import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  project: vi.fn(),
  cache: vi.fn(),
  log: vi.fn(),
  cloud: vi.fn(),
}))
vi.mock('@/data-access/projects', () => ({ getProjectById: mocks.project }))
vi.mock('@/integrations/bullmq/prewarm', () => ({
  enqueuePrewarmJobs: vi.fn(),
}))
vi.mock('@/lib/analytics-buffer/buffer', () => ({
  enqueueRequestLog: mocks.log,
}))
vi.mock('@/lib/billing/service-gate', () => ({
  orgEntitledForServing: () => true,
}))
vi.mock('@/lib/cache/cache', () => ({
  buildCacheKey: () => 'key',
  readCacheEntry: mocks.cache,
  writeCache: vi.fn(),
}))
vi.mock('@/lib/logger/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
  errorContext: () => ({}),
}))
vi.mock('@/env/server', () => ({ env: {} }))
vi.mock('@/server/deployment', () => ({ isCloud: mocks.cloud }))

import { optimizeProjectImage } from './index'

const input = {
  accept: 'image/webp',
  projectId: 'project',
  searchParams: new URLSearchParams(),
  src: 'https://example.test/image.jpg',
  recordActivation: true,
}

describe('managed first-image observation at the transform boundary', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.cloud.mockReturnValue(true)
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
    mocks.log.mockResolvedValue(undefined)
  })

  it('marks successful origin work in the existing durable billing ingress', async () => {
    await optimizeProjectImage(input)
    expect(mocks.log).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        projectId: 'project',
        orgId: 'organization',
      }),
      true,
    )
  })

  it.each([
    { recordActivation: false },
    { recordLog: false },
    { trusted: true },
  ])('excludes non-delivery/prewarm/trusted work %j', async (overrides) => {
    await optimizeProjectImage({ ...input, ...overrides })
    expect(mocks.log.mock.calls.every((call) => call[1] === false)).toBe(true)
  })

  it('does not record self-hosted traffic', async () => {
    mocks.cloud.mockReturnValue(false)
    await optimizeProjectImage(input)
    expect(mocks.log).toHaveBeenCalledWith(expect.any(Object), false)
  })

  it('does not record empty output or failed transforms', async () => {
    mocks.cache.mockResolvedValueOnce({
      data: Buffer.alloc(0),
      originalBytes: 0,
    })
    await optimizeProjectImage(input)
    mocks.cache.mockRejectedValueOnce(new Error('Synthetic transform failure'))
    await expect(optimizeProjectImage(input)).rejects.toThrow()
    expect(mocks.log.mock.calls.every((call) => call[1] === false)).toBe(true)
  })

  it('does not acknowledge an outcome before the required durable writes', async () => {
    mocks.log.mockRejectedValueOnce(
      new Error('Synthetic billing write failure'),
    )
    await expect(optimizeProjectImage(input)).rejects.toThrow()
  })
})
