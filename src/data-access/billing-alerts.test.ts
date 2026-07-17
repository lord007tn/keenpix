import { describe, expect, it, vi } from 'vitest'

const findMany = vi.hoisted(() => vi.fn())

vi.mock('@/db', () => ({
  prisma: {
    billingAlert: { create: vi.fn() },
    member: { findMany: vi.fn() },
    subscription: { findMany },
  },
}))

const { listAlertableSubscriptions } = await import('./billing-alerts')

describe('listAlertableSubscriptions', () => {
  it('excludes complimentary subscriptions from paid usage alerts', async () => {
    findMany.mockResolvedValue([])

    await listAlertableSubscriptions()

    expect(findMany).toHaveBeenCalledWith({
      where: {
        polarSubscriptionId: { not: null },
        status: { in: ['active', 'trialing', 'past_due', 'unpaid'] },
      },
      select: {
        orgId: true,
        plan: true,
        status: true,
        currentPeriodStart: true,
        organization: { select: { name: true } },
      },
    })
  })
})
