import { afterEach, describe, expect, it, vi } from 'vitest'

const findUnique = vi.hoisted(() => vi.fn())
const create = vi.hoisted(() => vi.fn())
const updateMany = vi.hoisted(() => vi.fn())
const deleteMany = vi.hoisted(() => vi.fn())
const createAudit = vi.hoisted(() => vi.fn())
const POLAR_MANAGED = /Polar/

vi.mock('@/db', () => {
  const tx = {
    subscription: { findUnique, create, updateMany, deleteMany },
    subscriptionGrantAudit: { create: createAudit },
  }
  return {
    prisma: {
      $transaction: (operation: (client: typeof tx) => unknown) =>
        operation(tx),
    },
  }
})

const { removeComplimentarySubscription, setComplimentarySubscription } =
  await import('./subscriptions')

afterEach(() => {
  vi.clearAllMocks()
})

describe('complimentary subscriptions', () => {
  it('refuses to alter a provider-managed subscription', async () => {
    findUnique.mockResolvedValue({
      plan: 'pro',
      polarSubscriptionId: 'sub_1',
    })

    await expect(
      setComplimentarySubscription({
        actorId: 'admin_1',
        orgId: 'org_1',
        plan: 'business',
      }),
    ).rejects.toThrow(POLAR_MANAGED)
    expect(updateMany).not.toHaveBeenCalled()
    expect(createAudit).not.toHaveBeenCalled()
  })

  it('updates local access with zero revenue and appends an audit event', async () => {
    findUnique.mockResolvedValue({ plan: 'basic', polarSubscriptionId: null })
    updateMany.mockResolvedValue({ count: 1 })

    await setComplimentarySubscription({
      actorId: 'admin_1',
      orgId: 'org_1',
      plan: 'business',
    })

    expect(updateMany).toHaveBeenCalledWith({
      where: { orgId: 'org_1', polarSubscriptionId: null },
      data: expect.objectContaining({
        plan: 'business',
        status: 'active',
        amountCents: 0,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      }),
    })
    expect(createAudit).toHaveBeenCalledWith({
      data: {
        orgId: 'org_1',
        actorId: 'admin_1',
        action: 'updated',
        previousPlan: 'basic',
        plan: 'business',
      },
    })
  })

  it('revokes only a row that still has no provider linkage', async () => {
    findUnique.mockResolvedValue({ plan: 'pro', polarSubscriptionId: null })
    deleteMany.mockResolvedValue({ count: 1 })

    await removeComplimentarySubscription({
      actorId: 'admin_1',
      orgId: 'org_1',
    })

    expect(deleteMany).toHaveBeenCalledWith({
      where: { orgId: 'org_1', polarSubscriptionId: null },
    })
    expect(createAudit).toHaveBeenCalledWith({
      data: {
        orgId: 'org_1',
        actorId: 'admin_1',
        action: 'revoked',
        previousPlan: 'pro',
      },
    })
  })
})
