import { prisma } from '@keenpix/database'

const PROVIDER_MANAGED_MESSAGE =
  'Provider-managed subscriptions must be changed in Polar.'

export function setComplimentarySubscription(input: {
  actorId: string
  orgId: string
  plan: string
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.subscription.findUnique({
      where: { orgId: input.orgId },
      select: { plan: true, polarSubscriptionId: true },
    })
    if (existing?.polarSubscriptionId) {
      throw new Error(PROVIDER_MANAGED_MESSAGE)
    }

    if (existing) {
      const updated = await tx.subscription.updateMany({
        where: { orgId: input.orgId, polarSubscriptionId: null },
        data: {
          plan: input.plan,
          status: 'active',
          amountCents: 0,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          overageAllowed: false,
          cancelAtPeriodEnd: false,
          polarModifiedAt: null,
        },
      })
      if (updated.count === 0) {
        throw new Error(PROVIDER_MANAGED_MESSAGE)
      }
    } else {
      await tx.subscription.create({
        data: {
          orgId: input.orgId,
          plan: input.plan,
          status: 'active',
          amountCents: 0,
        },
      })
    }

    await tx.subscriptionGrantAudit.create({
      data: {
        orgId: input.orgId,
        actorId: input.actorId,
        action: existing ? 'updated' : 'granted',
        previousPlan: existing?.plan ?? null,
        plan: input.plan,
      },
    })
    return { orgId: input.orgId, plan: input.plan }
  })
}

export function removeComplimentarySubscription(input: {
  actorId: string
  orgId: string
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.subscription.findUnique({
      where: { orgId: input.orgId },
      select: { plan: true, polarSubscriptionId: true },
    })
    if (existing?.polarSubscriptionId) {
      throw new Error(PROVIDER_MANAGED_MESSAGE)
    }
    if (!existing) {
      return { orgId: input.orgId, plan: null }
    }

    const removed = await tx.subscription.deleteMany({
      where: { orgId: input.orgId, polarSubscriptionId: null },
    })
    if (removed.count === 0) {
      throw new Error(PROVIDER_MANAGED_MESSAGE)
    }
    await tx.subscriptionGrantAudit.create({
      data: {
        orgId: input.orgId,
        actorId: input.actorId,
        action: 'revoked',
        previousPlan: existing.plan,
      },
    })
    return { orgId: input.orgId, plan: null }
  })
}
