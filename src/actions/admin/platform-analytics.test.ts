import { describe, expect, it, vi } from 'vitest'

const listCustomerAccounts = vi.hoisted(() => vi.fn())

vi.mock('@/data-access/admin/customers', () => ({ listCustomerAccounts }))
vi.mock('@/data-access/admin/platform-analytics', () => ({
  aggregatePlatformSummary: vi.fn().mockResolvedValue({}),
  groupPlatformByBucket: vi.fn().mockResolvedValue([]),
  groupPlatformByOrg: vi.fn().mockResolvedValue([]),
  platformAnalyticsCoverageStart: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/data-access/analytics-rollups', () => ({
  historicalRollupBucketing: vi.fn().mockReturnValue({
    gte: new Date('2026-07-01T00:00:00Z'),
    lt: new Date('2026-07-31T00:00:00Z'),
  }),
}))
vi.mock('@/helpers/analytics/rollup-shapers', () => ({
  summarizeAgg: vi.fn().mockReturnValue({}),
  timeSeriesFromBuckets: vi.fn().mockReturnValue([]),
}))

const { getPlatformAnalytics } = await import('./platform-analytics')

describe('platform revenue reporting', () => {
  it('counts MRR only from entitled provider-managed subscriptions', async () => {
    listCustomerAccounts.mockResolvedValue([
      {
        id: 'paid',
        name: 'Paid',
        billing: {
          source: 'polar',
          status: 'active',
          amountCents: 1900,
          mrrCents: 2400,
        },
        effectivePlan: { plan: 'pro' },
        suspendedAt: null,
      },
      {
        id: 'complimentary',
        name: 'Complimentary',
        billing: {
          source: 'admin_grant',
          status: 'active',
          amountCents: 0,
          mrrCents: 0,
        },
        effectivePlan: { plan: 'business' },
        suspendedAt: null,
      },
      {
        id: 'canceled',
        name: 'Canceled',
        billing: {
          source: 'polar',
          status: 'canceled',
          amountCents: 3900,
          mrrCents: 0,
        },
        effectivePlan: null,
        suspendedAt: null,
      },
      {
        id: 'free',
        name: 'Free',
        billing: {
          source: 'free',
          status: null,
          amountCents: 0,
          mrrCents: 0,
        },
        effectivePlan: null,
        suspendedAt: null,
      },
    ])

    const result = await getPlatformAnalytics({ range: '30d' })

    expect(result.paidMrrCents).toBe(2400)
    expect(result.activePaidSubscriptionCount).toBe(1)
    expect(result.complimentaryCustomerCount).toBe(1)
  })
})
