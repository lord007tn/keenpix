import dayjs from 'dayjs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  deleteMany,
  deleteRequestEventsBefore,
  groupBy,
  isCloud,
  subscriptions,
} = vi.hoisted(() => ({
  deleteMany: vi.fn(),
  deleteRequestEventsBefore: vi.fn(),
  groupBy: vi.fn(),
  isCloud: vi.fn(),
  subscriptions: vi.fn(),
}))

vi.mock('@keenpix/database', () => ({
  prisma: {
    requestLog: { deleteMany, groupBy },
    subscription: { findMany: subscriptions },
  },
}))
vi.mock('@/lib/clickhouse/retention', () => ({ deleteRequestEventsBefore }))
vi.mock('@/server/deployment', () => ({ isCloud }))
vi.mock('@/lib/logger/logger', () => ({
  errorContext: vi.fn(() => ({})),
  logger: { error: vi.fn() },
}))

const { pruneLogRetention } = await import('./log-retention')

describe('daily log retention', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(dayjs('2026-10-17T03:00:00Z').toDate())
    isCloud.mockReturnValue(true)
    subscriptions.mockResolvedValue([
      { orgId: 'paid', plan: 'business', status: 'active' },
      { orgId: 'lapsed', plan: 'business', status: 'canceled' },
    ])
    groupBy.mockResolvedValue([
      { orgId: 'paid' },
      { orgId: 'lapsed' },
      { orgId: 'never-subscribed' },
    ])
    deleteMany.mockResolvedValue({ count: 2 })
    deleteRequestEventsBefore.mockResolvedValue(undefined)
  })

  afterEach(() => vi.useRealTimers())

  it('groups log organizations in the database and preserves plan cutoffs', async () => {
    await expect(pruneLogRetention()).resolves.toEqual({
      orgs: 3,
      prunedRows: 6,
    })
    // findMany({ distinct }) would fetch the entire event table into Node.
    expect(groupBy).toHaveBeenCalledExactlyOnceWith({ by: ['orgId'] })
    for (const [orgId, days] of [
      ['paid', 365],
      ['lapsed', 30],
      ['never-subscribed', 30],
    ] as const) {
      const cutoff = dayjs().subtract(days, 'day').toDate()
      expect(deleteMany).toHaveBeenCalledWith({
        where: { orgId, ts: { lt: cutoff } },
      })
      expect(deleteRequestEventsBefore).toHaveBeenCalledWith(orgId, cutoff)
    }
    expect(deleteMany).toHaveBeenCalledTimes(3)
  })

  it('continues the sweep after one organization fails', async () => {
    deleteMany.mockRejectedValueOnce(new Error('temporary database failure'))
    await expect(pruneLogRetention()).resolves.toEqual({
      orgs: 3,
      prunedRows: 4,
    })
    expect(deleteMany).toHaveBeenCalledTimes(3)
    expect(deleteRequestEventsBefore).toHaveBeenCalledTimes(2)
  })

  it('does not read or prune self-hosted logs', async () => {
    isCloud.mockReturnValue(false)
    await expect(pruneLogRetention()).resolves.toEqual({
      orgs: 0,
      prunedRows: 0,
    })
    expect(groupBy).not.toHaveBeenCalled()
    expect(deleteMany).not.toHaveBeenCalled()
  })
})
