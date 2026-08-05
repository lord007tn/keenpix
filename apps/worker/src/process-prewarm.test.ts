import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPrewarmProcessor } from './process-prewarm'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createPrewarmProcessor', () => {
  it('sends an authenticated job to the app runtime', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const processPrewarm = createPrewarmProcessor({
      appUrl: 'http://app:3000',
      secret: 'worker-secret',
      timeoutMs: 60_000,
    })
    const job = {
      accept: 'image/avif,image/webp,image/*',
      params: { fmt: 'auto', project: 'project_1', w: '640' },
      projectId: 'project_1',
      src: 'https://images.example.com/photo.jpg',
    }

    await processPrewarm(job)

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][0].toString()).toBe(
      'http://app:3000/api/internal/transforms/prewarm',
    )
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      body: JSON.stringify(job),
      headers: {
        authorization: 'Bearer worker-secret',
        'content-type': 'application/json',
      },
      method: 'POST',
    })
  })

  it('fails the BullMQ job when the app rejects the transform', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Unavailable', { status: 503 })),
    )
    const processPrewarm = createPrewarmProcessor({
      appUrl: 'http://app:3000',
      secret: 'worker-secret',
      timeoutMs: 60_000,
    })

    await expect(
      processPrewarm({
        accept: '',
        params: { fmt: 'webp', project: 'project_1', w: '640' },
        projectId: 'project_1',
        src: 'https://images.example.com/photo.jpg',
      }),
    ).rejects.toThrow('HTTP 503: Unavailable')
  })
})
