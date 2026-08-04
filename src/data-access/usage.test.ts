import { describe, expect, it, vi } from 'vitest'

const { analyticsAggregate, edgeAggregate, findMany } = vi.hoisted(() => ({
  analyticsAggregate: vi.fn(),
  edgeAggregate: vi.fn(),
  findMany: vi.fn(),
}))

vi.mock('@/db', () => ({
  prisma: {
    analyticsRollupHourly: { aggregate: analyticsAggregate },
    billingCustomer: { findMany },
    projectEdgeRollupHourly: { aggregate: edgeAggregate },
  },
}))

const { deliveredBytesSince, listUsageBillingCustomers } = await import(
  './usage'
)

describe('deliveredBytesSince', () => {
  it('adds successful managed-edge offloads to application delivery once', async () => {
    analyticsAggregate.mockResolvedValue({ _sum: { bytesOut: 400n } })
    edgeAggregate.mockResolvedValue({ _sum: { bytes: 600n } })

    const result = await deliveredBytesSince(
      'org_a',
      new Date('2026-08-01T00:00:00Z'),
    )

    expect(result.bytes).toBe(1000)
    expect(edgeAggregate).toHaveBeenCalledWith({
      where: {
        orgId: 'org_a',
        bucketStart: {
          gte: new Date('2026-08-01T00:00:00Z'),
          lt: result.through,
        },
        stage: 'edge',
        status: { gte: 200, lt: 300 },
      },
      _sum: { bytes: true },
    })
  })
})

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
