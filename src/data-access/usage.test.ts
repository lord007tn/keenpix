import { describe, expect, it, vi } from 'vitest'

const findMany = vi.hoisted(() => vi.fn())

vi.mock('@/db', () => ({
  prisma: { billingCustomer: { findMany } },
}))

const { listUsageBillingCustomers } = await import('./usage')

describe('listUsageBillingCustomers', () => {
  it('meters only subscriptions that are currently linked to Polar', async () => {
    findMany.mockResolvedValue([])

    await listUsageBillingCustomers()

    expect(findMany).toHaveBeenCalledWith({
      where: {
        organization: {
          subscription: { is: { polarSubscriptionId: { not: null } } },
        },
      },
      select: {
        orgId: true,
        polarCustomerId: true,
        lastUsageReportAt: true,
      },
    })
  })
})
