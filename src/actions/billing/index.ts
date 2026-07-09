import { getActiveInternalPlanGrant } from '@/data-access/internal-plan-grants'
import {
  getOrgSubscription,
  orgHasBillingCustomer,
  setSubscriptionSpendCap,
} from '@/data-access/subscriptions'
import { billingUsageSnapshot } from '@/data-access/usage'
import { getPlan, getPlanRank, type PlanId } from '@/lib/billing/plans'

const GB = 1024 ** 3

// Statuses that grant plan entitlements (mirror of data-access ENTITLED).
const ENTITLED = new Set(['active', 'trialing'])

export interface UsageState {
  // Delivered bytes over the period — the metered quantity billed to Polar.
  bandwidthBytes: number
  // Plan's included bytes, or null when unsubscribed (no allowance).
  includedBytes: number | null
  // Bytes past the included allowance (0 when within it or unsubscribed).
  overageBytes: number
  // Projected overage cost in cents at the plan's per-GB rate (Polar bills whole
  // GB), 0 when within allowance / unsubscribed.
  overageCostCents: number
  // ISO start of the window usage is measured over (subscription period start,
  // or the current calendar month when unsubscribed).
  periodStart: string
  projects: { used: number; limit: number | null }
  seats: { used: number; limit: number | null }
}

export interface BillingState {
  // True when the subscription is set to cancel at period end: still active and
  // serving until currentPeriodEnd, but it will NOT renew. Lets the UI say
  // "Ends {date}" instead of "Renews {date}" and offer a resume affordance.
  cancelAtPeriodEnd: boolean
  // ISO timestamp the current paid period ends (renewal/expiry), or null.
  currentPeriodEnd: string | null
  // True once the org has a Polar customer — gates the portal even when canceled.
  hasBillingCustomer: boolean
  orgId: string
  // The plan the org's subscription grants, or null when unsubscribed.
  plan: PlanId | null
  planName: string | null
  planSource: 'billing' | 'internal' | null
  // Customer-set overage spending cap in cents, or null when no cap is set.
  spendCapCents: number | null
  // Raw Polar status (active/trialing/past_due/canceled/…), or null.
  status: string | null
  usage: UsageState
}

// Start of the current UTC calendar month — the usage window for an org without
// a subscription period to anchor to.
function startOfMonthUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

// The org's billing snapshot for the settings/account UI. Reads the locally-
// mirrored Subscription row (kept in sync by Polar webhooks) so it never calls
// Polar on the hot path, plus a period usage snapshot for the meter. Returns an
// unsubscribed snapshot (usage still populated) when there's no row.
export async function getBillingState(orgId: string): Promise<BillingState> {
  const [sub, internalGrant] = await Promise.all([
    getOrgSubscription(orgId),
    getActiveInternalPlanGrant(orgId),
  ])
  const internalPlan = getPlan(internalGrant?.plan)
  const billingPlan = getPlan(sub?.plan)
  const billingEntitledPlan =
    sub && ENTITLED.has(sub.status) ? billingPlan : null
  const internalWins =
    getPlanRank(internalPlan) > getPlanRank(billingEntitledPlan)
  const plan = internalWins ? internalPlan : billingEntitledPlan
  let planSource: BillingState['planSource'] = null
  if (internalWins) {
    planSource = 'internal'
  } else if (billingEntitledPlan) {
    planSource = 'billing'
  }
  const entitled = Boolean(sub && ENTITLED.has(sub.status))
  const internallyEntitled = Boolean(internalWins)
  // Measure usage over the paid period when subscribed, else the calendar month.
  const periodStart =
    (entitled && !internallyEntitled ? sub?.currentPeriodStart : null) ??
    startOfMonthUtc(new Date())
  const [snapshot, hasBillingCustomer] = await Promise.all([
    billingUsageSnapshot(orgId, periodStart),
    orgHasBillingCustomer(orgId),
  ])

  const includedBytes = plan?.includedBandwidthBytes ?? null
  const overageBytes =
    includedBytes === null ? 0 : Math.max(0, snapshot.bytes - includedBytes)
  // Match how Polar bills: we ingest fractional GB (bytes / GB), so overage is
  // charged on the fractional overage, not rounded up to whole GB.
  const overageCostCents = plan
    ? Math.round((overageBytes / GB) * plan.overagePerGbCents)
    : 0

  return {
    orgId,
    plan: plan?.id ?? null,
    planName: plan?.name ?? null,
    planSource,
    status: internallyEntitled ? 'internal' : (sub?.status ?? null),
    hasBillingCustomer,
    // "Scheduled to cancel" only makes sense for a live subscription (active/
    // trialing). Polar keeps cancel_at_period_end=true on the terminal
    // revoked/canceled payload too, so gate on `entitled` — otherwise a
    // long-churned org would show a "you'll keep access until {past date}" notice.
    // Internal grants don't bill, so they never cancel-at-period-end.
    cancelAtPeriodEnd: Boolean(
      entitled && !internallyEntitled && sub?.cancelAtPeriodEnd,
    ),
    currentPeriodEnd: internallyEntitled
      ? null
      : (sub?.currentPeriodEnd?.toISOString() ?? null),
    // Cap only applies to a real billing subscription (internal grants don't bill).
    spendCapCents: internallyEntitled ? null : (sub?.spendCapCents ?? null),
    usage: {
      periodStart: periodStart.toISOString(),
      bandwidthBytes: snapshot.bytes,
      includedBytes,
      overageBytes,
      overageCostCents: internallyEntitled ? 0 : overageCostCents,
      projects: { used: snapshot.projects, limit: plan?.maxProjects ?? null },
      seats: { used: snapshot.seats, limit: plan?.maxSeats ?? null },
    },
  }
}

// Set or clear (null) the org's overage spending cap. The serving-gate cache is
// busted by the caller (functions/billing) so this action stays data-access only.
export function setSpendCap(orgId: string, spendCapCents: number | null) {
  return setSubscriptionSpendCap(orgId, spendCapCents)
}
