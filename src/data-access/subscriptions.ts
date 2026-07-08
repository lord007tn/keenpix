import { prisma } from '@/db'
import { getPlan, type Plan } from '@/lib/billing/plans'

// Statuses that grant plan entitlements (features + quota). `trialing` is
// included so a trial has full access; past_due/canceled/etc. fall through to
// "no plan" — a delinquent org can't create NEW projects/seats.
const ENTITLED = new Set(['active', 'trialing'])

// Statuses that keep SERVING existing traffic. Wider than ENTITLED: it includes
// the dunning states (past_due/unpaid) so a single failed renewal doesn't take a
// live customer's images dark instantly — Polar retries payment for days, and
// `revoked` is the definitive cutoff. This is the grace window.
const SERVING = new Set(['active', 'trialing', 'past_due', 'unpaid'])

export function getOrgSubscription(orgId: string) {
  return prisma.subscription.findUnique({ where: { orgId } })
}

// Whether an org may serve transforms right now, including the dunning grace.
// Cloud-only concern; self-host never calls this (it always serves).
export async function orgIsServable(orgId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({
    where: { orgId },
    select: { status: true },
  })
  return sub ? SERVING.has(sub.status) : false
}

// Whether the org has a linked Polar customer. A canceled/past_due org keeps its
// customer, so this (not the active plan) gates the billing-portal button — they
// still need to reach invoices and update payment.
export async function orgHasBillingCustomer(orgId: string): Promise<boolean> {
  const count = await prisma.billingCustomer.count({ where: { orgId } })
  return count > 0
}

// The org's effective plan, or null when it has no entitled subscription. Cloud
// gates a null-plan org; self-host never calls this (it runs unlimited).
export async function getOrgPlan(orgId: string): Promise<Plan | null> {
  const sub = await prisma.subscription.findUnique({
    where: { orgId },
    select: { plan: true, status: true },
  })
  if (!(sub && ENTITLED.has(sub.status))) {
    return null
  }
  return getPlan(sub.plan)
}

export interface SubscriptionSnapshot {
  currentPeriodEnd?: Date | null
  currentPeriodStart?: Date | null
  orgId: string
  overageAllowed?: boolean
  plan: string
  polarSubscriptionId: string
  status: string
}

// Webhook-facing upserts — keep the local snapshot in sync with Polar so the hot
// path reads entitlements from Postgres, never Polar.
export function upsertSubscription(input: SubscriptionSnapshot) {
  return prisma.subscription.upsert({
    where: { orgId: input.orgId },
    update: input,
    create: input,
  })
}

// Mirror the subscription AND its billing-customer link in ONE transaction, so an
// org can never end up entitled-but-unmetered — a Subscription row (which gates
// serving) without the BillingCustomer that the usage cron iterates. With pure
// metered billing there is no cap, so an unmetered entitled org would serve
// unlimited bandwidth billed to nobody.
export function upsertSubscriptionWithCustomer(
  input: SubscriptionSnapshot,
  polarCustomerId: string,
) {
  return prisma.$transaction([
    prisma.subscription.upsert({
      where: { orgId: input.orgId },
      update: input,
      create: input,
    }),
    prisma.billingCustomer.upsert({
      where: { orgId: input.orgId },
      update: { polarCustomerId },
      // Start the usage watermark at creation time. Without this, the first cron
      // run sees lastUsageReportAt = null and deliveredBytesSince(orgId, null)
      // sums ALL-time delivered bytes — over-billing any org that served traffic
      // (e.g. during a trial) before its billing customer row existed.
      create: {
        orgId: input.orgId,
        polarCustomerId,
        lastUsageReportAt: new Date(),
      },
    }),
  ])
}
