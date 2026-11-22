import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DragonflyCacheStore } from './dragonfly-cache-store'

const redis = vi.hoisted(() => ({
  commandQueue: { length: 0 },
  getBuffer: vi.fn(),
  eval: vi.fn(),
  get: vi.fn(),
  zrange: vi.fn(),
}))

vi.mock('ioredis', () => ({
  default: class {
    constructor() {
      Object.assign(this, redis)
    }
  },
}))

describe('Dragonfly cache pressure', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    redis.commandQueue.length = 0
  })

  it('stops accepting image reads while outstanding commands fill its budget', async () => {
    const cache = new DragonflyCacheStore('redis://example.test', 1024)
    let resolveRead: (value: null) => void = () => undefined
    const reply = new Promise<null>((resolve) => {
      resolveRead = resolve
    })
    redis.getBuffer.mockReturnValue(reply)
    const reads = Array.from({ length: 16 }, (_, i) =>
      cache.getEntry(String(i), 'webp'),
    )
    const overflow = cache.getEntry('overflow', 'webp')
    const observed = Promise.allSettled([...reads, overflow])
    resolveRead(null)
    expect((await observed).at(-1)?.status).toBe('rejected')
    expect(redis.getBuffer).toHaveBeenCalledTimes(16)
    await expect(cache.getEntry('recovered', 'webp')).resolves.toBeNull()
  })

  it('skips commands while the client still has a backlog of timed-out work', async () => {
    const cache = new DragonflyCacheStore('redis://example.test', 1024)
    redis.commandQueue.length = 16
    await expect(
      cache.set('image', 'webp', Buffer.from('image')),
    ).rejects.toThrow()
    expect(redis.eval).not.toHaveBeenCalled()
  })

  it('shares an eviction sweep when concurrent writes exceed the byte limit', async () => {
    const cache = new DragonflyCacheStore('redis://example.test', 1024)
    let resolveTotal: (value: string) => void = () => undefined
    const total = new Promise<string>((resolve) => {
      resolveTotal = resolve
    })
    redis.eval.mockResolvedValueOnce(1050).mockResolvedValueOnce(1100)
    redis.eval.mockResolvedValueOnce(1000)
    redis.get.mockReturnValueOnce(total).mockResolvedValue('1000')
    redis.zrange.mockResolvedValueOnce(['old.webp'])
    const first = cache.set('one', 'webp', Buffer.from('one'))
    const second = cache.set('two', 'webp', Buffer.from('two'))
    try {
      await vi.waitFor(() => expect(redis.get).toHaveBeenCalledTimes(1))
    } finally {
      resolveTotal('1100')
      await Promise.all([first, second])
    }
    expect(redis.zrange).toHaveBeenCalledTimes(1)
  })
})
