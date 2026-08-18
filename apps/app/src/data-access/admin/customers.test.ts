import { beforeEach, describe, expect, it, vi } from 'vitest'

const findMany = vi.hoisted(() => vi.fn())
const groupBy = vi.hoisted(() => vi.fn())
const edgeGroupBy = vi.hoisted(() => vi.fn())

vi.mock('@keenpix/database', () => ({
  prisma: {
    analyticsRollupHourly: { groupBy },
    projectEdgeRollupHourly: { groupBy: edgeGroupBy },
    organization: { findMany, update: vi.fn() },
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
  subscriptionAddons: [],
  _count: { members: 1, projects: 1 },
}

describe('customer usage summaries', () => {
  beforeEach(() => {
    findMany.mockReset()
    groupBy.mockReset()
    edgeGroupBy.mockReset()
    edgeGroupBy.mockResolvedValue([])
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
      totalBandwidthBytes: 1000,
      bytesSaved: 1800,
      edgeRequests: 0,
      edgeBandwidthBytes: 0,
      originAttemptedRequests: 10,
      originRequests: 9,
      originBandwidthBytes: 900,
      lastTrafficAt: '2026-08-03T13:00:00.000Z',
    })
  })

  it('adds attributed Edge offloads without double-counting origin stages', async () => {
    findMany.mockResolvedValue([organization])
    groupBy.mockResolvedValue([
      {
        orgId: 'org_1',
        status: 200,
        _max: { bucketStart: new Date('2026-08-03T12:00:00.000Z') },
        _sum: {
          requests: 6,
          cachedRequests: 2,
          bytesOut: 600n,
          bytesSaved: 400n,
        },
      },
    ])
    edgeGroupBy.mockResolvedValue([
      {
        orgId: 'org_1',
        stage: 'edge',
        _max: { bucketStart: new Date('2026-08-03T13:00:00.000Z') },
        _sum: { requests: 4, bytes: 400n },
      },
      {
        orgId: 'org_1',
        stage: 'cache',
        _max: { bucketStart: new Date('2026-08-03T13:00:00.000Z') },
        _sum: { requests: 2, bytes: 200n },
      },
    ])

    const [customer] = await listCustomerAccounts()

    expect(customer?.usage30d).toEqual(
      expect.objectContaining({
        attemptedRequests: 10,
        requests: 10,
        cachedRequests: 6,
        cacheHitRate: 0.6,
        bandwidthBytes: 1000,
        edgeRequests: 4,
        edgeBandwidthBytes: 400,
        originAttemptedRequests: 6,
      }),
    )
  })

  it('returns the real subscription period for admin billing filters', async () => {
    findMany.mockResolvedValue([
      {
        ...organization,
        subscription: {
          amountCents: 1900,
          cancelAtPeriodEnd: false,
          currentPeriodEnd: new Date('2026-08-08T00:00:00.000Z'),
          currentPeriodStart: new Date('2026-07-08T00:00:00.000Z'),
          overageAllowed: true,
          plan: 'pro',
          polarSubscriptionId: 'sub_1',
          status: 'active',
          updatedAt: new Date('2026-07-08T00:00:00.000Z'),
        },
      },
    ])
    groupBy.mockResolvedValue([])

    const [customer] = await listCustomerAccounts()

    expect(customer?.billing).toEqual(
      expect.objectContaining({
        currentPeriodEnd: '2026-08-08T00:00:00.000Z',
        currentPeriodStart: '2026-07-08T00:00:00.000Z',
      }),
    )
  })

  it('includes entitled recurring add-ons in customer MRR', async () => {
    findMany.mockResolvedValue([
      {
        ...organization,
        subscription: {
          amountCents: 1900,
          cancelAtPeriodEnd: false,
          currentPeriodEnd: new Date('2026-08-08T00:00:00.000Z'),
          currentPeriodStart: new Date('2026-07-08T00:00:00.000Z'),
          overageAllowed: true,
          plan: 'pro',
          polarSubscriptionId: 'sub_1',
          status: 'active',
          updatedAt: new Date('2026-07-08T00:00:00.000Z'),
        },
        subscriptionAddons: [
          { kind: 'custom_domains', status: 'active' },
          { kind: 'future_addon', status: 'revoked' },
        ],
      },
    ])
    groupBy.mockResolvedValue([])

    const [customer] = await listCustomerAccounts()

    expect(customer?.billing).toEqual(
      expect.objectContaining({
        addonAmountCents: 500,
        mrrCents: 2400,
        recurringChargeCount: 2,
      }),
    )
  })
})
