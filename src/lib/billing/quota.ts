import {
  getOrgPlan,
  getOrgSubscription,
  isOrgSuspended,
  orgIsServable,
} from '@/data-access/subscriptions'
import { deliveredBytesSince } from '@/data-access/usage'
import { prisma } from '@/db'
import { getPlan } from '@/lib/billing/plans'
import { isCloud } from '@/server/deployment'

const GB = 1024 ** 3

// Start of the current UTC month — the usage window when there's no billing
// period to anchor to (mirrors getBillingState).
function startOfMonthUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

// Plan-limit enforcement. Self-host has no billing, so every check is a no-op
// (unlimited). Cloud reads the org's active plan; an org with no active
// subscription is blocked from consuming resources (there is no cloud free tier).

const NO_SUBSCRIPTION =
  'An active subscription is required. Choose a plan under Settings → Plan & billing.'
const PAYMENT_ISSUE =
  'Your subscription has a payment issue. Update your payment method under Settings → Plan & billing to continue.'
const DUNNING_STATUSES = new Set(['past_due', 'unpaid'])

// A dunning customer (past_due/unpaid) has no entitled plan, but telling them "an
// active subscription is required — choose a plan" is wrong and alarming. Give
// them the payment-fix message instead of the never-subscribed one.
async function noPlanError(orgId: string): Promise<Error> {
  const sub = await getOrgSubscription(orgId)
  if (sub && DUNNING_STATUSES.has(sub.status)) {
    return new Error(PAYMENT_ISSUE)
  }
  return new Error(NO_SUBSCRIPTION)
}

export async function assertCanCreateProject(orgId: string): Promise<void> {
  if (!isCloud()) {
    return
  }
  const plan = await getOrgPlan(orgId)
  if (!plan) {
    throw await noPlanError(orgId)
  }
  if (plan.maxProjects === null) {
    return
  }
  const count = await prisma.project.count({ where: { orgId } })
  if (count >= plan.maxProjects) {
    throw new Error(
      `Your ${plan.name} plan includes ${plan.maxProjects} projects. Upgrade to add more.`,
    )
  }
}

export async function assertCanAddSeat(orgId: string): Promise<void> {
  if (!isCloud()) {
    return
  }
  const plan = await getOrgPlan(orgId)
  if (!plan) {
    throw await noPlanError(orgId)
  }
  const count = await prisma.member.count({
    where: { organizationId: orgId },
  })
  if (count >= plan.maxSeats) {
    throw new Error(
      `Your ${plan.name} plan includes ${plan.maxSeats} seats. Upgrade to add more.`,
    )
  }
}

// Whether an org may serve transforms. Cloud requires a subscription in a serving
// state — active/trialing, PLUS the dunning grace (past_due/unpaid) so a failed
// renewal doesn't instantly take a live site dark; `revoked` ends it. No free
// tier, so an unsubscribed org can't serve. Self-host always serves.
export async function orgCanServe(orgId: string): Promise<boolean> {
  if (!isCloud()) {
    return true
  }
  // Operator suspension is an unconditional kill-switch, checked before billing.
  if (await isOrgSuspended(orgId)) {
    return false
  }
  const servable = await orgIsServable(orgId)
  if (!servable) {
    return false
  }
  return orgWithinSpendCap(orgId)
}

// Hard spending cap. Once an org's accrued overage cost this period reaches the
// cap it set (in cents), it stops being served. Approximate by design — usage is
// read from hourly rollups and the serving gate caches this decision for 60s — so
// real spend can overshoot the cap by up to ~1h of traffic. It's a runaway-bill
// backstop, not a to-the-cent ceiling. A null cap, no billing plan, or no
// subscription means no cap.
async function orgWithinSpendCap(orgId: string): Promise<boolean> {
  const sub = await getOrgSubscription(orgId)
  if (!sub || sub.spendCapCents === null) {
    return true
  }
  const plan = getPlan(sub.plan)
  if (!plan) {
    return true
  }
  const periodStart = sub.currentPeriodStart ?? startOfMonthUtc(new Date())
  const { bytes } = await deliveredBytesSince(orgId, periodStart)
  const overageBytes = Math.max(0, bytes - plan.includedBandwidthBytes)
  const overageCostCents = Math.round(
    (overageBytes / GB) * plan.overagePerGbCents,
  )
  return overageCostCents <= sub.spendCapCents
}
