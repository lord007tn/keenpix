import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPrewarmProcessor } from './process-prewarm'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createPrewarmProcessor', () => {
  it('sends an authenticated job to the transform runtime', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const processPrewarm = createPrewarmProcessor({
      transformUrl: 'http://transform:3002',
      secret: 'worker-secret',
      timeoutMs: 60_000,
    })
    const job = {
      accept: 'image/avif,image/webp,image/*',
      correlationId: 'correlation-1',
      params: { fmt: 'auto', project: 'project_1', w: '640' },
      projectId: 'project_1',
      requestedAt: '2026-08-13T00:00:00.000Z',
      src: 'https://images.example.com/photo.jpg',
      version: 1 as const,
    }

    await processPrewarm(job)

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][0].toString()).toBe(
      'http://transform:3002/v1/transforms/prewarm',
    )
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      body: JSON.stringify(job),
      headers: {
        authorization: 'Bearer worker-secret',
        'content-type': 'application/json',
        'x-correlation-id': 'correlation-1',
      },
      method: 'POST',
    })
  })

  it('fails the BullMQ job when the transform service rejects the job', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Unavailable', { status: 503 })),
    )
    const processPrewarm = createPrewarmProcessor({
      transformUrl: 'http://transform:3002',
      secret: 'worker-secret',
      timeoutMs: 60_000,
    })

    await expect(
      processPrewarm({
        accept: '',
        correlationId: 'correlation-2',
        params: { fmt: 'webp', project: 'project_1', w: '640' },
        projectId: 'project_1',
        requestedAt: '2026-08-13T00:00:00.000Z',
        src: 'https://images.example.com/photo.jpg',
        version: 1,
      }),
    ).rejects.toThrow('HTTP 503: Unavailable')
  })
})
