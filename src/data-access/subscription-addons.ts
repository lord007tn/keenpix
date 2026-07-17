import { prisma } from '@/db'
import type { Prisma } from '@/generated/prisma/client'
import {
  CUSTOM_DOMAIN_ADDON,
  type SubscriptionAddonKind,
} from '@/lib/billing/addons'

const ENTITLED = new Set(['active', 'trialing'])

export interface SubscriptionAddonSnapshot {
  cancelAtPeriodEnd?: boolean
  currentPeriodEnd?: Date | null
  currentPeriodStart?: Date | null
  kind: SubscriptionAddonKind
  orgId: string
  polarModifiedAt?: Date | null
  polarSubscriptionId: string
  status: string
  units: number
}

type Tx = Prisma.TransactionClient

export function getSubscriptionAddon(
  orgId: string,
  kind: SubscriptionAddonKind,
) {
  return prisma.subscriptionAddon.findUnique({
    where: { orgId_kind: { orgId, kind } },
  })
}

export async function getCustomDomainAddonUnits(orgId: string) {
  const addon = await getSubscriptionAddon(orgId, CUSTOM_DOMAIN_ADDON.kind)
  return addon && ENTITLED.has(addon.status) ? addon.units : 0
}

async function applySubscriptionAddonSync(
  db: Tx,
  input: SubscriptionAddonSnapshot,
) {
  const existing = await db.subscriptionAddon.findUnique({
    where: { orgId_kind: { orgId: input.orgId, kind: input.kind } },
    select: { polarModifiedAt: true, polarSubscriptionId: true, status: true },
  })
  if (existing && existing.polarSubscriptionId === input.polarSubscriptionId) {
    if (existing.status === 'revoked' && input.status !== 'revoked') {
      return false
    }
    if (
      existing.polarModifiedAt &&
      input.polarModifiedAt &&
      input.polarModifiedAt < existing.polarModifiedAt
    ) {
      return false
    }
  }
  await db.subscriptionAddon.upsert({
    where: { orgId_kind: { orgId: input.orgId, kind: input.kind } },
    update: input,
    create: input,
  })
  return true
}

export function upsertSubscriptionAddon(input: SubscriptionAddonSnapshot) {
  return prisma.$transaction((tx) => applySubscriptionAddonSync(tx, input))
}
