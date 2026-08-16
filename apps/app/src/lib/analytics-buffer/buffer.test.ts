import { afterEach, describe, expect, it, vi } from 'vitest'

const {
  drainAnalyticsOutboxBatch,
  persistAnalyticsOutboxEvent,
  recordRequestEvents,
  transaction,
} = vi.hoisted(() => ({
  drainAnalyticsOutboxBatch: vi.fn(),
  persistAnalyticsOutboxEvent: vi.fn(),
  recordRequestEvents: vi.fn(),
  transaction: vi.fn(),
}))
const cloud = vi.hoisted(() => ({ value: false }))

vi.mock('@keenpix/database', () => ({
  prisma: { $transaction: transaction },
}))

vi.mock('@/data-access/analytics-rollups', () => ({
  aggregateRollupIncrements: vi.fn(() => []),
  applyRollupIncrement: vi.fn(),
}))

vi.mock('@/data-access/analytics-outbox', () => ({
  drainAnalyticsOutboxBatch,
  persistAnalyticsOutboxEvent,
}))

vi.mock('@/lib/clickhouse/events', () => ({
  recordRequestEvents,
}))

vi.mock('@/lib/logger/logger', () => ({
  errorContext: vi.fn(() => ({})),
  logger: { error: vi.fn(), warn: vi.fn() },
}))
vi.mock('@/server/deployment', () => ({ isCloud: () => cloud.value }))

const { enqueueRequestLog, flushDurableRequestLogs, flushRequestLogs } =
  await import('./buffer')

afterEach(() => {
  cloud.value = false
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('analytics buffer', () => {
  it('commits a successful managed delivery before resolving', async () => {
    vi.useFakeTimers()
    cloud.value = true
    persistAnalyticsOutboxEvent.mockResolvedValue({})

    await enqueueRequestLog({
      bytesIn: 100,
      bytesOut: 50,
      bytesSaved: 50,
      cached: false,
      format: 'webp',
      latencyMs: 20,
      orgId: 'org_1',
      path: '/hero.jpg',
      projectId: 'project_1',
      status: 200,
    })

    expect(persistAnalyticsOutboxEvent).toHaveBeenCalledOnce()
    expect(transaction).not.toHaveBeenCalled()
  })

  it('drains durable events into analytics batches before billing reads them', async () => {
    const event = {
      bytesIn: 100,
      bytesOut: 50,
      bytesSaved: 50,
      cached: false,
      format: 'webp',
      id: 'event_1',
      latencyMs: 20,
      orgId: 'org_1',
      path: '/hero.jpg',
      projectId: 'project_1',
      status: 200,
      ts: new Date('2026-08-15T04:00:00Z'),
    }
    drainAnalyticsOutboxBatch.mockResolvedValueOnce({
      status: 'drained',
      events: [event],
      remaining: 0,
    })

    await flushDurableRequestLogs()

    expect(drainAnalyticsOutboxBatch).toHaveBeenCalledOnce()
    expect(recordRequestEvents).toHaveBeenCalledWith([event])
  })

  it('reruns a complete billing drain after joining a weaker background pass', async () => {
    let releaseBackground: (value: { status: 'busy' }) => void = () => undefined
    const backgroundResult = new Promise<{ status: 'busy' }>((resolve) => {
      releaseBackground = resolve
    })
    drainAnalyticsOutboxBatch
      .mockReturnValueOnce(backgroundResult)
      .mockResolvedValueOnce({ status: 'empty' })

    const background = flushDurableRequestLogs()
    const billing = flushDurableRequestLogs({
      requireComplete: true,
      through: new Date('2026-08-15T03:00:00Z'),
    })
    releaseBackground({ status: 'busy' })

    await background
    await billing
    expect(drainAnalyticsOutboxBatch).toHaveBeenCalledTimes(2)
  })

  it('drains a batch whose timer fires while another flush is still running', async () => {
    vi.useFakeTimers()
    let finishFirst: () => void = () => {
      throw new Error('first flush did not start')
    }
    transaction
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            finishFirst = resolve
          }),
      )
      .mockImplementation(async (run) =>
        run({ requestLog: { createMany: vi.fn() } }),
      )

    const request = {
      bytesIn: 100,
      bytesOut: 50,
      bytesSaved: 50,
      cached: false,
      format: 'webp',
      latencyMs: 20,
      orgId: 'org_1',
      path: '/hero.jpg',
      projectId: 'project_1',
      status: 200,
    }

    enqueueRequestLog(request)
    await vi.advanceTimersByTimeAsync(2000)
    const firstFlush = flushRequestLogs()
    expect(transaction).toHaveBeenCalledTimes(1)

    enqueueRequestLog({ ...request, path: '/second.jpg' })
    await vi.advanceTimersByTimeAsync(2000)
    expect(transaction).toHaveBeenCalledTimes(1)

    finishFirst()
    await firstFlush
    await flushRequestLogs()

    expect(transaction).toHaveBeenCalledTimes(2)
  })
})
