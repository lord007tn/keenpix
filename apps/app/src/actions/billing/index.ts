import { getSubscriptionAddon } from '@/data-access/subscription-addons'
import {
  getBillingCustomer,
  getOrgSubscription,
  orgHasBillingCustomer,
} from '@/data-access/subscriptions'
import { billingUsageSnapshot } from '@/data-access/usage'
import { CUSTOM_DOMAIN_ADDON } from '@/lib/billing/addons'
import { getPlan, type PlanId, TRIAL } from '@/lib/billing/plans'
import { getCustomDomainAddonProductId } from '@/lib/billing/polar-checkout-products'
import { createPolarClient } from '@/lib/billing/polar-client'
import { getAppUrl } from '@/server/deployment'

const GB = 1024 ** 3

// Statuses that grant plan entitlements (mirror of data-access ENTITLED).
const ENTITLED = new Set(['active', 'trialing'])

export interface UsageState {
  // Managed delivery over the period, including Cloudflare edge offloads — the
  // metered quantity billed to Polar.
  bandwidthBytes: number
  customDomains: { used: number; limit: number | null }
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
  seats: { used: number; limit: number | null; pending: number }
}

export interface BillingState {
  billingSource: 'admin_grant' | 'free' | 'polar'
  // True when the subscription is set to cancel at period end: still active and
  // serving until currentPeriodEnd, but it will NOT renew. Lets the UI say
  // "Ends {date}" instead of "Renews {date}" and offer a resume affordance.
  cancelAtPeriodEnd: boolean
  // ISO timestamp the current paid period ends (renewal/expiry), or null.
  currentPeriodEnd: string | null
  domainAddon: {
    canPurchase: boolean
    cancelAtPeriodEnd: boolean
    priceMonthlyUsd: number
    status: string | null
    units: number
  }
  // True once the org has a Polar customer — gates the portal even when canceled.
  hasBillingCustomer: boolean
  orgId: string
  // The plan the org's subscription grants, or null when unsubscribed.
  plan: PlanId | null
  planLimits: {
    analyticsHistoryDays: number
    logRetentionDays: number
  } | null
  planName: string | null
  // Local subscription status (active/trialing/past_due/canceled/…), or null.
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
  const [sub, domainAddon] = await Promise.all([
    getOrgSubscription(orgId),
    getSubscriptionAddon(orgId, CUSTOM_DOMAIN_ADDON.kind),
  ])
  const entitled = Boolean(sub && ENTITLED.has(sub.status))
  let billingSource: BillingState['billingSource'] = 'free'
  if (sub?.polarSubscriptionId) {
    billingSource = 'polar'
  } else if (sub) {
    billingSource = 'admin_grant'
  }
  const complimentary = entitled && billingSource === 'admin_grant'
  const plan = entitled ? getPlan(sub?.plan) : null
  // Measure usage over the paid period when subscribed, else the calendar month.
  const periodStart =
    (entitled && !complimentary ? sub?.currentPeriodStart : null) ??
    startOfMonthUtc(new Date())
  const [snapshot, hasBillingCustomer] = await Promise.all([
    billingUsageSnapshot(orgId, periodStart),
    orgHasBillingCustomer(orgId),
  ])

  // During a trial the honest numbers are the trial's: the serving allowance is
  // TRIAL.bandwidthBytes (delivery pauses there) and nothing is billed — the
  // usage cron skips trialing orgs — so overage must read as $0, not a
  // projection against the plan allowance the org isn't paying for yet.
  const trialing = Boolean(sub?.status === 'trialing' && !complimentary)
  const includedBytes = trialing
    ? TRIAL.bandwidthBytes
    : (plan?.includedBandwidthBytes ?? null)
  const overageBytes =
    trialing || includedBytes === null
      ? 0
      : Math.max(0, snapshot.bytes - includedBytes)
  // Match how Polar bills: we ingest fractional GB (bytes / GB), so overage is
  // charged on the fractional overage, not rounded up to whole GB.
  const overageCostCents =
    plan && !trialing
      ? Math.round(
          (overageBytes / GB) *
            (billingSource === 'polar' && sub?.overagePerGbCents
              ? sub.overagePerGbCents
              : plan.overagePerGbCents),
        )
      : 0
  const addonUnits =
    domainAddon && ENTITLED.has(domainAddon.status) ? domainAddon.units : 0
  const customDomainLimit =
    plan && plan.customDomains !== null ? plan.customDomains + addonUnits : null

  return {
    orgId,
    plan: plan?.id ?? null,
    planName: plan?.name ?? null,
    planLimits: plan
      ? {
          analyticsHistoryDays: plan.historyDays,
          logRetentionDays: plan.logRetentionDays,
        }
      : null,
    billingSource,
    status: sub?.status ?? null,
    hasBillingCustomer,
    // "Scheduled to cancel" only makes sense for a live subscription (active/
    // trialing). Polar keeps cancel_at_period_end=true on the terminal
    // revoked/canceled payload too, so gate on `entitled` — otherwise a
    // long-churned org would show a "you'll keep access until {past date}" notice.
    // Complimentary access does not renew or cancel through Polar.
    cancelAtPeriodEnd: Boolean(
      entitled && !complimentary && sub?.cancelAtPeriodEnd,
    ),
    currentPeriodEnd: complimentary
      ? null
      : (sub?.currentPeriodEnd?.toISOString() ?? null),
    domainAddon: {
      canPurchase: Boolean(
        plan?.id === 'business' &&
          !complimentary &&
          Boolean(sub?.polarSubscriptionId) &&
          sub?.status === 'active' &&
          (!domainAddon || domainAddon.status === 'revoked'),
      ),
      cancelAtPeriodEnd: Boolean(domainAddon?.cancelAtPeriodEnd),
      priceMonthlyUsd: CUSTOM_DOMAIN_ADDON.priceMonthlyUsd,
      status: domainAddon?.status ?? null,
      units: addonUnits,
    },
    usage: {
      periodStart: periodStart.toISOString(),
      bandwidthBytes: snapshot.bytes,
      includedBytes,
      overageBytes,
      overageCostCents: complimentary ? 0 : overageCostCents,
      customDomains: {
        used: snapshot.customDomains,
        limit: customDomainLimit,
      },
      projects: {
        used: snapshot.projects,
        limit: trialing ? TRIAL.maxProjects : (plan?.maxProjects ?? null),
      },
      seats: {
        used: snapshot.seats + snapshot.pendingSeats,
        limit: plan?.maxSeats ?? null,
        pending: snapshot.pendingSeats,
      },
    },
  }
}

export async function createCustomDomainAddonCheckout(orgId: string) {
  const [client, sub, customer, existing] = await Promise.all([
    Promise.resolve(createPolarClient()),
    getOrgSubscription(orgId),
    getBillingCustomer(orgId),
    getSubscriptionAddon(orgId, CUSTOM_DOMAIN_ADDON.kind),
  ])
  if (!client) {
    throw new Error('Billing is not configured for this deployment.')
  }
  if (
    !(
      sub?.polarSubscriptionId &&
      sub.plan === 'business' &&
      sub.status === 'active'
    )
  ) {
    throw new Error(
      'The custom-domain pack is available to active Business subscriptions.',
    )
  }
  if (!customer) {
    throw new Error('No billing customer is linked to this workspace.')
  }
  if (existing && existing.status !== 'revoked') {
    throw new Error('This workspace already has a custom-domain pack.')
  }
  const productId = await getCustomDomainAddonProductId(client)
  const returnUrl = `${getAppUrl()}/app/account?section=billing`
  const checkout = await client.checkouts.create({
    allowTrial: false,
    customerId: customer.polarCustomerId,
    metadata: {
      addon: CUSTOM_DOMAIN_ADDON.kind,
      orgId,
      units: CUSTOM_DOMAIN_ADDON.units,
    },
    products: [productId],
    returnUrl,
    successUrl: returnUrl,
  })
  return { url: checkout.url }
}

// Create the portal session from the org's mirrored Polar customer id, not the
// current user's Better Auth id. Billing belongs to the organization: another
// owner/admin must be able to recover payment or invoices even when a different
// member originally completed checkout.
export async function createBillingPortalSession(orgId: string) {
  const [client, customer] = await Promise.all([
    Promise.resolve(createPolarClient()),
    getBillingCustomer(orgId),
  ])
  if (!client) {
    throw new Error('Billing is not configured for this deployment.')
  }
  if (!customer) {
    throw new Error(
      'No billing account is linked to this workspace. Contact support if you previously subscribed.',
    )
  }
  const session = await client.customerSessions.create({
    customerId: customer.polarCustomerId,
    returnUrl: `${getAppUrl()}/app/account?section=billing`,
  })
  return { url: session.customerPortalUrl }
}
