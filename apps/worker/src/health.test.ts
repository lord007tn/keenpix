import { describe, expect, it, vi } from 'vitest'
import { getWorkerHealth } from './health'

describe('getWorkerHealth', () => {
  it('is ready only when the consumer and queue are available', async () => {
    await expect(
      getWorkerHealth({
        isShuttingDown: () => false,
        isWorkerRunning: () => true,
        pingQueue: vi.fn().mockResolvedValue('PONG'),
      }),
    ).resolves.toEqual({ queue: 'ready', ready: true })
  })

  it('fails closed during shutdown or a queue outage', async () => {
    await expect(
      getWorkerHealth({
        isShuttingDown: () => true,
        isWorkerRunning: () => true,
        pingQueue: vi.fn().mockResolvedValue('PONG'),
      }),
    ).resolves.toEqual({ queue: 'unavailable', ready: false })

    await expect(
      getWorkerHealth({
        isShuttingDown: () => false,
        isWorkerRunning: () => true,
        pingQueue: vi.fn().mockRejectedValue(new Error('offline')),
      }),
    ).resolves.toEqual({ queue: 'unavailable', ready: false })
  })
})
