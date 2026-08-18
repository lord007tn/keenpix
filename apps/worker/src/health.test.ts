import { describe, expect, it, vi } from 'vitest'
import { getWorkerHealthDetails } from './health'

describe('getWorkerHealthDetails', () => {
  it('is ready only when the consumer and queue are available', async () => {
    const health = await getWorkerHealthDetails({
      environment: 'test',
      isShuttingDown: () => false,
      isWorkerRunning: () => true,
      pingQueue: vi.fn().mockResolvedValue('PONG'),
      uptime: () => 12,
    })

    expect(health).toMatchObject({
      components: {
        queue: { status: 'healthy' },
        worker: { status: 'healthy' },
      },
      environment: 'test',
      status: 'healthy',
      uptime: 12,
    })
    expect(health.timestamp).toEqual(expect.any(String))
  })

  it('fails closed during shutdown or a queue outage', async () => {
    await expect(
      getWorkerHealthDetails({
        environment: 'test',
        isShuttingDown: () => true,
        isWorkerRunning: () => true,
        pingQueue: vi.fn().mockResolvedValue('PONG'),
      }),
    ).resolves.toMatchObject({
      components: { worker: { status: 'unhealthy' } },
      status: 'unhealthy',
    })

    await expect(
      getWorkerHealthDetails({
        environment: 'test',
        isShuttingDown: () => false,
        isWorkerRunning: () => true,
        pingQueue: vi.fn().mockRejectedValue(new Error('offline')),
      }),
    ).resolves.toMatchObject({
      components: { queue: { status: 'unhealthy' } },
      status: 'unhealthy',
    })
  })
})
