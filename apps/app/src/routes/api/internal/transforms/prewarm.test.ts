import { beforeEach, describe, expect, it, vi } from 'vitest'

const optimizeProjectImage = vi.hoisted(() => vi.fn())

vi.mock('@/actions/transform', () => ({ optimizeProjectImage }))
vi.mock('@/env/server', () => ({
  env: { KEENPIX_WORKER_SECRET: 'a'.repeat(32) },
}))
vi.mock('@/lib/logger/logger', () => ({
  errorContext: vi.fn(() => ({})),
  logger: { error: vi.fn() },
}))

const { handlePrewarmTransform } = await import('./prewarm')

function createRequest(secret = 'a'.repeat(32)) {
  return new Request('http://localhost/api/internal/transforms/prewarm', {
    body: JSON.stringify({
      accept: 'image/avif,image/webp,image/*',
      params: { fmt: 'auto', project: 'project_1', w: '640' },
      projectId: 'project_1',
      src: 'https://images.example.com/photo.jpg',
    }),
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
    },
    method: 'POST',
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('handlePrewarmTransform', () => {
  it('rejects an invalid worker secret', async () => {
    const response = await handlePrewarmTransform(createRequest('wrong'))

    expect(response.status).toBe(401)
    expect(optimizeProjectImage).not.toHaveBeenCalled()
  })

  it('executes an authenticated prewarm transform', async () => {
    optimizeProjectImage.mockResolvedValue({})

    const response = await handlePrewarmTransform(createRequest())

    expect(response.status).toBe(204)
    expect(optimizeProjectImage).toHaveBeenCalledWith({
      accept: 'image/avif,image/webp,image/*',
      projectId: 'project_1',
      recordLog: false,
      searchParams: new URLSearchParams({
        fmt: 'auto',
        project: 'project_1',
        w: '640',
      }),
      src: 'https://images.example.com/photo.jpg',
      trusted: true,
    })
  })
})
