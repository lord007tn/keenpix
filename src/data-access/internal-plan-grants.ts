import dayjs from 'dayjs'
import { prisma } from '@/db'

export function getActiveInternalPlanGrant(orgId: string) {
  return prisma.internalPlanGrant.findFirst({
    where: {
      orgId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: dayjs().toDate() } }],
    },
    select: {
      orgId: true,
      plan: true,
      reason: true,
      grantedById: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

export function setInternalPlanGrant(input: {
  expiresAt?: Date | null
  grantedById: string
  orgId: string
  plan: string
  reason?: string | null
}) {
  return prisma.internalPlanGrant.upsert({
    where: { orgId: input.orgId },
    update: {
      plan: input.plan,
      reason: input.reason ?? null,
      grantedById: input.grantedById,
      expiresAt: input.expiresAt ?? null,
    },
    create: {
      orgId: input.orgId,
      plan: input.plan,
      reason: input.reason ?? null,
      grantedById: input.grantedById,
      expiresAt: input.expiresAt ?? null,
    },
  })
}

export function removeInternalPlanGrant(orgId: string) {
  return prisma.internalPlanGrant.deleteMany({ where: { orgId } })
}
