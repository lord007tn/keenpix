import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getQueueStats = vi.hoisted(() => vi.fn())
const loggerWarn = vi.hoisted(() => vi.fn())

vi.mock('@/lib/queue/transform-queue', () => ({ getQueueStats }))
vi.mock('@/lib/logger/logger', () => ({
  logger: { warn: loggerWarn, info: vi.fn() },
}))

const { beginShutdown, drainTransformQueue, isShuttingDown } = await import(
  './shutdown'
)

describe('shutdown readiness flag', () => {
  // Declared first: beginShutdown is intentionally one-way (no un-shutdown), so
  // this must observe the false→true transition before anything flips it.
  it('starts ready and flips to not-ready once shutdown begins', () => {
    expect(isShuttingDown()).toBe(false)
    beginShutdown()
    expect(isShuttingDown()).toBe(true)
  })
})

describe('drainTransformQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    getQueueStats.mockReset()
    loggerWarn.mockReset()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves immediately when the queue is already empty', async () => {
    getQueueStats.mockReturnValue({ active: 0, queued: 0 })
    await expect(drainTransformQueue(5000)).resolves.toBeUndefined()
    expect(loggerWarn).not.toHaveBeenCalled()
  })

  it('waits for active + queued work, then resolves once the queue empties', async () => {
    getQueueStats
      .mockReturnValueOnce({ active: 2, queued: 1 })
      .mockReturnValueOnce({ active: 1, queued: 0 })
      .mockReturnValue({ active: 0, queued: 0 })
    const drained = drainTransformQueue(10_000)
    await vi.advanceTimersByTimeAsync(400)
    await expect(drained).resolves.toBeUndefined()
    expect(loggerWarn).not.toHaveBeenCalled()
  })

  it('is bounded: gives up after the timeout and warns if work never drains', async () => {
    getQueueStats.mockReturnValue({ active: 1, queued: 3 })
    const drained = drainTransformQueue(1000)
    await vi.advanceTimersByTimeAsync(1000)
    await expect(drained).resolves.toBeUndefined()
    expect(loggerWarn).toHaveBeenCalledWith(
      { active: 1, queued: 3 },
      expect.stringContaining('drain timed out'),
    )
  })
})
