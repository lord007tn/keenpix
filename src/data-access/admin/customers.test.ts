import { beforeEach, describe, expect, it, vi } from 'vitest'

const findMany = vi.hoisted(() => vi.fn())
const findUnique = vi.hoisted(() => vi.fn())
const groupBy = vi.hoisted(() => vi.fn())

vi.mock('@/db', () => ({
  prisma: {
    analyticsRollupHourly: { groupBy },
    organization: { findMany, findUnique, update: vi.fn() },
  },
}))

const { listCustomerAccounts } = await import('./customers')

const organization = {
  id: 'org_1',
  name: 'Joodlab',
  slug: 'joodlab',
  createdAt: new Date('2026-07-08T00:00:00.000Z'),
  suspendedAt: null,
  suspendedReason: null,
  members: [
    {
      id: 'member_1',
      role: 'owner',
      user: {
        id: 'user_1',
        email: 'owner@example.com',
        name: 'Owner',
        role: 'user',
        createdAt: new Date('2026-07-08T00:00:00.000Z'),
      },
    },
  ],
  subscription: null,
  _count: { members: 1, projects: 1 },
}

describe('customer usage summaries', () => {
  beforeEach(() => {
    findMany.mockReset()
    findUnique.mockReset()
    groupBy.mockReset()
  })

  it('shows successful deliveries while retaining attempts for cost accounting', async () => {
    findMany.mockResolvedValue([organization])
    groupBy.mockResolvedValue([
      {
        orgId: 'org_1',
        status: 200,
        _max: { bucketStart: new Date('2026-08-03T12:00:00.000Z') },
        _sum: {
          requests: 9,
          cachedRequests: 6,
          bytesOut: 900n,
          bytesSaved: 1800n,
        },
      },
      {
        orgId: 'org_1',
        status: 500,
        _max: { bucketStart: new Date('2026-08-03T13:00:00.000Z') },
        _sum: {
          requests: 1,
          cachedRequests: 0,
          bytesOut: 100n,
          bytesSaved: 0n,
        },
      },
    ])

    const [customer] = await listCustomerAccounts()

    expect(groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ by: ['orgId', 'status'] }),
    )
    expect(customer?.usage30d).toEqual({
      attemptedRequests: 10,
      requests: 9,
      cachedRequests: 6,
      cacheHitRate: 2 / 3,
      bandwidthBytes: 900,
      bytesSaved: 1800,
      lastTrafficAt: '2026-08-03T13:00:00.000Z',
    })
  })
})
