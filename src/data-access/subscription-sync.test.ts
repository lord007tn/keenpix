import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const subFindUnique = vi.hoisted(() => vi.fn())
const subUpsert = vi.hoisted(() => vi.fn())
const customerUpsert = vi.hoisted(() => vi.fn())
const createAudit = vi.hoisted(() => vi.fn())
vi.mock('@/db', () => {
  const tx = {
    subscription: { findUnique: subFindUnique, upsert: subUpsert },
    subscriptionGrantAudit: { create: createAudit },
    billingCustomer: { upsert: customerUpsert },
  }
  return {
    prisma: {
      $transaction: (fn: (tx: unknown) => unknown) => Promise.resolve(fn(tx)),
    },
  }
})
const { upsertSubscription, upsertSubscriptionWithCustomer } = await import(
  './subscriptions'
)

const OLDER = new Date('2026-07-10T10:00:00Z')
const NEWER = new Date('2026-07-10T11:00:00Z')

function snapshot(overrides: Record<string, unknown> = {}) {
  return {
    amountCents: 1900,
    currentPeriodStart: new Date('2026-07-01T00:00:00Z'),
    orgId: 'org_a',
    overagePerGbCents: 6,
    polarSubscriptionId: 'sub_1',
    plan: 'pro',
    status: 'active',
    polarModifiedAt: NEWER,
    ...overrides,
  }
}

beforeEach(() => {
  subUpsert.mockResolvedValue({})
  customerUpsert.mockResolvedValue({})
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('webhook out-of-order guard', () => {
  it('drops a retried non-revoked event after revocation of the same subscription', async () => {
    subFindUnique.mockResolvedValue({
      polarSubscriptionId: 'sub_1',
      status: 'revoked',
      polarModifiedAt: OLDER,
    })
    await upsertSubscription(snapshot({ status: 'active' }))
    expect(subUpsert).not.toHaveBeenCalled()
  })

  it('drops an event older than the last applied one', async () => {
    subFindUnique.mockResolvedValue({
      polarSubscriptionId: 'sub_1',
      status: 'active',
      polarModifiedAt: NEWER,
    })
    await upsertSubscription(
      snapshot({ status: 'past_due', polarModifiedAt: OLDER }),
    )
    expect(subUpsert).not.toHaveBeenCalled()
  })

  it('applies a newer event over an older applied one', async () => {
    subFindUnique.mockResolvedValue({
      polarSubscriptionId: 'sub_1',
      status: 'active',
      polarModifiedAt: OLDER,
    })
    await upsertSubscription(snapshot({ status: 'canceled' }))
    expect(subUpsert).toHaveBeenCalledOnce()
  })

  it('lets a NEW subscription id replace a revoked row (re-subscribe)', async () => {
    subFindUnique.mockResolvedValue({
      polarSubscriptionId: 'sub_1',
      status: 'revoked',
      polarModifiedAt: NEWER,
    })
    await upsertSubscription(
      snapshot({ polarSubscriptionId: 'sub_2', polarModifiedAt: OLDER }),
    )
    expect(subUpsert).toHaveBeenCalledOnce()
  })

  it('lets a provider snapshot replace complimentary access', async () => {
    subFindUnique.mockResolvedValue({
      polarSubscriptionId: null,
      plan: 'business',
      status: 'active',
      polarModifiedAt: null,
    })
    await upsertSubscription(snapshot())
    expect(subUpsert).toHaveBeenCalledWith({
      where: { orgId: 'org_a' },
      update: expect.objectContaining({
        polarSubscriptionId: 'sub_1',
        amountCents: 1900,
      }),
      create: expect.objectContaining({
        polarSubscriptionId: 'sub_1',
        amountCents: 1900,
        becamePayingAt: new Date('2026-07-01T00:00:00Z'),
      }),
    })
    expect(createAudit).toHaveBeenCalledWith({
      data: {
        orgId: 'org_a',
        action: 'replaced_by_provider',
        previousPlan: 'business',
        plan: 'pro',
      },
    })
  })

  it('does not count a provider trial as a paying founding customer', async () => {
    subFindUnique.mockResolvedValue(null)

    await upsertSubscription(
      snapshot({ status: 'trialing', currentPeriodStart: null }),
    )

    expect(subUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ becamePayingAt: null }),
      }),
    )
  })

  it('preserves the first paid timestamp after cancellation', async () => {
    const becamePayingAt = new Date('2026-06-01T00:00:00Z')
    subFindUnique.mockResolvedValue({
      becamePayingAt,
      polarSubscriptionId: 'sub_1',
      status: 'active',
      polarModifiedAt: OLDER,
    })

    await upsertSubscription(snapshot({ status: 'canceled' }))

    expect(subUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ becamePayingAt }),
      }),
    )
  })

  it('applies events without a modifiedAt (older payload shapes)', async () => {
    subFindUnique.mockResolvedValue({
      polarSubscriptionId: 'sub_1',
      status: 'active',
      polarModifiedAt: NEWER,
    })
    await upsertSubscription(snapshot({ polarModifiedAt: null }))
    expect(subUpsert).toHaveBeenCalledOnce()
  })

  it('skips the billing-customer upsert when the subscription event is stale', async () => {
    subFindUnique.mockResolvedValue({
      polarSubscriptionId: 'sub_1',
      status: 'revoked',
      polarModifiedAt: NEWER,
    })
    await upsertSubscriptionWithCustomer(
      snapshot({ status: 'active' }),
      'cus_1',
    )
    expect(subUpsert).not.toHaveBeenCalled()
    expect(customerUpsert).not.toHaveBeenCalled()
  })

  it('mirrors subscription and billing customer together for a fresh event', async () => {
    subFindUnique.mockResolvedValue(null)
    await upsertSubscriptionWithCustomer(snapshot(), 'cus_1')
    expect(subUpsert).toHaveBeenCalledOnce()
    expect(customerUpsert).toHaveBeenCalledOnce()
  })
})
