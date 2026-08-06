import { describe, expect, it, vi } from 'vitest'

const enqueuePrewarmJobs = vi.hoisted(() => vi.fn())

vi.mock('@/data-access/projects', () => ({ getProjectById: vi.fn() }))
vi.mock('@/integrations/bullmq/prewarm', () => ({ enqueuePrewarmJobs }))
vi.mock('@/lib/analytics-buffer/buffer', () => ({
  enqueueRequestLog: vi.fn(),
}))
vi.mock('@/lib/billing/service-gate', () => ({
  orgEntitledForServing: vi.fn(),
}))

const { prewarmProjectImages } = await import('./index')

describe('prewarmProjectImages', () => {
  it('enqueues every requested variant as a durable job', async () => {
    enqueuePrewarmJobs.mockResolvedValue([])

    const result = await prewarmProjectImages({
      formats: ['auto', 'avif', 'webp', 'jpeg', 'png'],
      projectId: 'project_1',
      sources: Array.from(
        { length: 20 },
        (_, index) => `https://images.example.com/${index}.jpg`,
      ),
      widths: [640, 1280],
    })

    expect(result.variantCount).toBe(200)
    expect(enqueuePrewarmJobs).toHaveBeenCalledOnce()
    const jobs = enqueuePrewarmJobs.mock.calls[0][0]
    expect(jobs).toHaveLength(200)
    expect(jobs[0]).toEqual({
      accept: 'image/avif,image/webp,image/*',
      params: { fmt: 'auto', project: 'project_1', w: '640' },
      projectId: 'project_1',
      src: 'https://images.example.com/0.jpg',
    })
  })
})
