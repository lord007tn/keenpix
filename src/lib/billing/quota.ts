import {
  getOrgPlan,
  getOrgSubscription,
  isOrgSuspended,
  orgIsServable,
} from '@/data-access/subscriptions'
import { deliveredBytesSince } from '@/data-access/usage'
import { prisma } from '@/db'
import { getPlan, TRIAL } from '@/lib/billing/plans'
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
  const sub = await getOrgSubscription(orgId)
  // A trial gets the plan's features with a bounded footprint; the full project
  // allowance unlocks when the trial converts to a paid period.
  if (sub?.status === 'trialing') {
    const count = await prisma.project.count({ where: { orgId } })
    if (count >= TRIAL.maxProjects) {
      throw new Error(
        `Your free trial includes up to ${TRIAL.maxProjects} projects. Your full ${plan.name} allowance unlocks when the trial converts.`,
      )
    }
    return
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
  // Internal-grant orgs have no subscription row: no trial cap, no spend cap.
  const sub = await getOrgSubscription(orgId)
  if (!sub) {
    return true
  }
  if (!(await orgWithinTrialAllowance(orgId, sub))) {
    return false
  }
  return orgWithinSpendCap(orgId, sub)
}

interface ServingSubscription {
  currentPeriodStart?: Date | null
  plan: string
  spendCapCents: number | null
  status?: string
}

// Trial bandwidth cap. Trial usage is never metered to Polar, so this cap is the
// platform's total exposure per trial: once a trialing org has delivered
// TRIAL.bandwidthBytes this period, serving pauses until the trial converts.
// Same ~1h approximation as the spend cap (hourly rollups + 60s gate cache).
async function orgWithinTrialAllowance(
  orgId: string,
  sub: ServingSubscription,
): Promise<boolean> {
  if (sub.status !== 'trialing') {
    return true
  }
  const periodStart = sub.currentPeriodStart ?? startOfMonthUtc(new Date())
  const { bytes } = await deliveredBytesSince(orgId, periodStart)
  return bytes <= TRIAL.bandwidthBytes
}

// Hard spending cap. Once an org's accrued overage cost this period reaches the
// cap it set (in cents), it stops being served. Approximate by design — usage is
// read from hourly rollups and the serving gate caches this decision for 60s — so
// real spend can overshoot the cap by up to ~1h of traffic. It's a runaway-bill
// backstop, not a to-the-cent ceiling. A null cap or no billing plan means no cap.
async function orgWithinSpendCap(
  orgId: string,
  sub: ServingSubscription,
): Promise<boolean> {
  if (sub.spendCapCents === null) {
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
