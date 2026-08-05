import { prisma } from '@/db'
import type { Prisma } from '@/generated/prisma/client'
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

// Counts organizations that have reached a real Polar-paid active state at
// least once. Trialing subscriptions and local admin grants never set this
// timestamp, while churned customers remain counted so founding slots cannot
// reopen later.
export function countFoundingCustomers() {
  return prisma.subscription.count({
    where: { becamePayingAt: { not: null } },
  })
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
// Fast suspension check for the serving gate: an operator-suspended org must not
// be served regardless of its subscription state.
export async function isOrgSuspended(orgId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { suspendedAt: true },
  })
  return Boolean(org?.suspendedAt)
}

export async function orgHasBillingCustomer(orgId: string): Promise<boolean> {
  const count = await prisma.billingCustomer.count({ where: { orgId } })
  return count > 0
}

export function getBillingCustomer(orgId: string) {
  return prisma.billingCustomer.findUnique({
    where: { orgId },
    select: { polarCustomerId: true },
  })
}

// The org's effective plan, or null when it has no entitled subscription. Cloud
// gates a null-plan org; self-host never calls this (it runs unlimited).
export async function getOrgPlan(orgId: string): Promise<Plan | null> {
  const sub = await prisma.subscription.findUnique({
    where: { orgId },
    select: { plan: true, status: true },
  })
  return sub && ENTITLED.has(sub.status) ? getPlan(sub.plan) : null
}

export interface SubscriptionSnapshot {
  amountCents: number
  // Mirrors Polar's cancel_at_period_end. Persisted on every webhook sync (the
  // upserts below spread the whole snapshot), so the billing UI can distinguish
  // "renews" from "ends" for an active-but-canceling subscription.
  cancelAtPeriodEnd?: boolean
  currentPeriodEnd?: Date | null
  currentPeriodStart?: Date | null
  orgId: string
  overageAllowed?: boolean
  overagePerGbCents: number
  plan: string
  // Polar's modified_at on the webhook payload — the ordering key for the
  // stale-event guard below.
  polarModifiedAt?: Date | null
  polarSubscriptionId: string
  status: string
}

type Tx = Prisma.TransactionClient

// Polar retries failed webhook deliveries, so events can arrive out of order.
// Two guards keep the mirror truthful for the SAME subscription id:
//   1. `revoked` is terminal — a late/retried non-revoked event can't resurrect
//      an ended subscription (a NEW subscription id may still replace the row:
//      that's the customer legitimately re-subscribing).
//   2. An event whose modified_at is OLDER than the applied one is dropped.
// Returns the previous status (for transition-triggered notifications) and
// whether the snapshot was applied.
export interface SubscriptionSyncResult {
  applied: boolean
  previousStatus: string | null
}

async function applySubscriptionSync(
  db: Tx,
  input: SubscriptionSnapshot,
): Promise<SubscriptionSyncResult> {
  const existing = await db.subscription.findUnique({
    where: { orgId: input.orgId },
    select: {
      becamePayingAt: true,
      plan: true,
      polarModifiedAt: true,
      polarSubscriptionId: true,
      status: true,
    },
  })
  const previousStatus = existing?.status ?? null
  if (existing && existing.polarSubscriptionId === input.polarSubscriptionId) {
    if (existing.status === 'revoked' && input.status !== 'revoked') {
      return { applied: false, previousStatus }
    }
    if (
      existing.polarModifiedAt &&
      input.polarModifiedAt &&
      input.polarModifiedAt < existing.polarModifiedAt
    ) {
      return { applied: false, previousStatus }
    }
  }
  const becamePayingAt =
    existing?.becamePayingAt ??
    (input.status === 'active'
      ? (input.currentPeriodStart ?? new Date())
      : null)
  const providerSnapshot = {
    ...input,
    becamePayingAt,
  }
  await db.subscription.upsert({
    where: { orgId: input.orgId },
    update: providerSnapshot,
    create: providerSnapshot,
  })
  if (existing && !existing.polarSubscriptionId) {
    await db.subscriptionGrantAudit.create({
      data: {
        orgId: input.orgId,
        action: 'replaced_by_provider',
        previousPlan: existing.plan,
        plan: input.plan,
      },
    })
  }
  return { applied: true, previousStatus }
}

// Webhook-facing upserts — keep the local snapshot in sync with Polar so the hot
// path reads entitlements from Postgres, never Polar.
export function upsertSubscription(
  input: SubscriptionSnapshot,
): Promise<SubscriptionSyncResult> {
  return prisma.$transaction((tx) => applySubscriptionSync(tx, input))
}

// Mirror the subscription AND its billing-customer link in ONE transaction, so an
// org can never end up entitled-but-unmetered — a Subscription row (which gates
// serving) without the BillingCustomer that the usage cron iterates. With pure
// metered billing there is no cap, so an unmetered entitled org would serve
// unlimited managed delivery billed to nobody.
export function upsertSubscriptionWithCustomer(
  input: SubscriptionSnapshot,
  polarCustomerId: string,
): Promise<SubscriptionSyncResult> {
  return prisma.$transaction(async (tx) => {
    const result = await applySubscriptionSync(tx, input)
    if (!result.applied) {
      return result
    }
    await tx.billingCustomer.upsert({
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
    })
    return result
  })
}
