import { afterEach, describe, expect, it, vi } from 'vitest'

const getProjectById = vi.hoisted(() => vi.fn())
const parseTransformParams = vi.hoisted(() => vi.fn())
const enqueueRequestLog = vi.hoisted(() => vi.fn())
const orgEntitledForServing = vi.hoisted(() => vi.fn())
const buildCacheKey = vi.hoisted(() => vi.fn())
const readCacheEntry = vi.hoisted(() => vi.fn())
const writeCache = vi.hoisted(() => vi.fn())
const logger = vi.hoisted(() => ({ error: vi.fn(), warn: vi.fn() }))
const fetchOriginImage = vi.hoisted(() => vi.fn())
const assertAllowedOrigin = vi.hoisted(() => vi.fn())
const assertSafeOrigin = vi.hoisted(() => vi.fn())
const runQueuedJob = vi.hoisted(() => vi.fn())
const transformImage = vi.hoisted(() => vi.fn())
const optimizeSvgImage = vi.hoisted(() => vi.fn())
const verifyTransformSignature = vi.hoisted(() => vi.fn())

vi.mock('@/data-access/projects', () => ({ getProjectById }))
vi.mock('@/helpers/transform/params', () => ({ parseTransformParams }))
vi.mock('@/lib/analytics-buffer/buffer', () => ({ enqueueRequestLog }))
vi.mock('@/lib/billing/service-gate', () => ({ orgEntitledForServing }))
vi.mock('@/lib/cache/cache', () => ({
  buildCacheKey,
  readCacheEntry,
  writeCache,
}))
vi.mock('@/lib/logger/logger', () => ({
  errorContext: vi.fn(() => ({})),
  logger,
}))
vi.mock('@/lib/origin/fetch-image', () => ({ fetchOriginImage }))
vi.mock('@/lib/origin/safe-origin', () => ({
  assertAllowedOrigin,
  assertSafeOrigin,
}))
vi.mock('@/lib/queue/transform-queue', () => ({ runQueuedJob }))
vi.mock('@/lib/sharp/transform', () => ({ transformImage }))
vi.mock('@/lib/svg/optimize', () => ({ optimizeSvgImage }))
vi.mock('@/lib/transform-signing/signing', () => ({
  verifyTransformSignature,
}))

const { prewarmProjectImages } = await import('./index')

afterEach(() => {
  vi.clearAllMocks()
})

describe('prewarmProjectImages', () => {
  it('feeds the transform queue with bounded workers', async () => {
    let active = 0
    let maxActive = 0
    let cacheKey = 0
    getProjectById.mockResolvedValue({
      id: 'project_1',
      orgId: 'org_1',
      requireSignedUrls: false,
      autoFormat: true,
      defaultQuality: 75,
      defaultDpr: 1,
      defaultFit: 'cover',
      maxWidth: 5000,
      allowedOrigins: ['images.example.com'],
      stripMetadata: true,
    })
    orgEntitledForServing.mockResolvedValue(true)
    parseTransformParams.mockImplementation((searchParams) => ({
      width: Number(searchParams.get('w')),
      quality: 75,
      format:
        searchParams.get('fmt') === 'auto' ? 'avif' : searchParams.get('fmt'),
    }))
    buildCacheKey.mockImplementation(() => {
      cacheKey += 1
      return `cache_${cacheKey}`
    })
    readCacheEntry.mockResolvedValue(null)
    assertSafeOrigin.mockImplementation((src) => new URL(src))
    fetchOriginImage.mockResolvedValue(Buffer.alloc(100))
    transformImage.mockResolvedValue({ data: Buffer.alloc(50) })
    writeCache.mockResolvedValue(undefined)
    runQueuedJob.mockImplementation(async (work) => {
      active += 1
      maxActive = Math.max(maxActive, active)
      await new Promise((resolve) => setTimeout(resolve, 1))
      try {
        return await work()
      } finally {
        active -= 1
      }
    })

    const result = prewarmProjectImages({
      formats: ['auto', 'avif', 'webp', 'jpeg', 'png'],
      projectId: 'project_1',
      sources: Array.from(
        { length: 20 },
        (_, index) => `https://images.example.com/${index}.jpg`,
      ),
      widths: [640, 1280],
    })

    expect(result.variantCount).toBe(200)
    await result.completion

    expect(runQueuedJob).toHaveBeenCalledTimes(200)
    expect(maxActive).toBe(4)
    expect(logger.warn).not.toHaveBeenCalled()
  })
})
