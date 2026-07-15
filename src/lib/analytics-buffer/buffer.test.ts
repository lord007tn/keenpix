import { afterEach, describe, expect, it, vi } from 'vitest'

const { transaction } = vi.hoisted(() => ({ transaction: vi.fn() }))

vi.mock('@/db', () => ({
  prisma: { $transaction: transaction },
}))

vi.mock('@/data-access/analytics-rollups', () => ({
  aggregateRollupIncrements: vi.fn(() => []),
  applyRollupIncrement: vi.fn(),
}))

vi.mock('@/lib/clickhouse/events', () => ({
  recordRequestEvents: vi.fn(),
}))

vi.mock('@/lib/logger/logger', () => ({
  errorContext: vi.fn(() => ({})),
  logger: { error: vi.fn(), warn: vi.fn() },
}))

const { enqueueRequestLog, flushRequestLogs } = await import('./buffer')

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('analytics buffer', () => {
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
