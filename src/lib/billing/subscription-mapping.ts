import type { SubscriptionAddonSnapshot } from '@/data-access/subscription-addons'
import type { SubscriptionSnapshot } from '@/data-access/subscriptions'
import {
  CUSTOM_DOMAIN_ADDON,
  isSubscriptionAddonKind,
} from '@/lib/billing/addons'
import {
  getPlan,
  getPlanCommercialTerms,
  type PricingPhase,
} from '@/lib/billing/plans'

// The subset of a Polar subscription webhook payload we read. Declared locally
// (not imported from the SDK) so the active/updated/canceled/revoked payloads
// all flow through one mapper by structural typing.
export interface PolarSubscriptionData {
  // Polar's fixed recurring subscription amount in cents. Metered usage is
  // separate and does not inflate this base MRR snapshot.
  amount?: number
  // Polar's cancel_at_period_end. When true the subscription is set to end at
  // currentPeriodEnd (status stays `active` until then), so it must NOT renew.
  cancelAtPeriodEnd?: boolean | null
  currentPeriodEnd?: Date | string | null
  currentPeriodStart?: Date | string | null
  customer?: { externalId?: string | null; id?: string } | null
  id: string
  metadata?: Record<string, unknown> | null
  // Polar's modified_at — the ordering key the sync uses to drop stale retried
  // deliveries. Optional because older payload shapes may omit it.
  modifiedAt?: Date | string | null
  product?: { metadata?: Record<string, unknown> | null } | null
  status: string
}

// Resolve the owning org for a subscription. At checkout we stamp the org id as
// the Polar `referenceId` (mirrored into subscription metadata) and set it on the
// customer's external id, so any of those links a subscription back to a tenant.
function resolveOrgId(sub: PolarSubscriptionData): string | null {
  const meta = sub.metadata ?? {}
  const candidate = meta.orgId ?? meta.referenceId ?? sub.customer?.externalId
  return typeof candidate === 'string' && candidate.length > 0
    ? candidate
    : null
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null
  }
  return value instanceof Date ? value : new Date(value)
}

// Pure mapping (unit-tested, no DB / no live Polar): a Polar subscription webhook
// payload → our local snapshot, or null when it can't be attributed (no org link,
// or a product whose `plan` metadata isn't a known plan).
export function mapSubscriptionSnapshot(
  sub: PolarSubscriptionData,
  status: string,
): SubscriptionSnapshot | null {
  const orgId = resolveOrgId(sub)
  const planId = sub.product?.metadata?.plan
  const plan = getPlan(typeof planId === 'string' ? planId : null)
  if (!(orgId && plan)) {
    return null
  }
  const phase: PricingPhase =
    sub.product?.metadata?.pricing_phase === 'standard'
      ? 'standard'
      : 'founding'
  const terms = getPlanCommercialTerms(plan.id, phase)
  const productOverage = Number(sub.product?.metadata?.overage_per_gb_cents)
  return {
    amountCents:
      typeof sub.amount === 'number' ? sub.amount : terms.priceMonthlyUsd * 100,
    orgId,
    overagePerGbCents: Number.isFinite(productOverage)
      ? productOverage
      : terms.overagePerGbCents,
    polarSubscriptionId: sub.id,
    plan: plan.id,
    status,
    currentPeriodStart: toDate(sub.currentPeriodStart),
    currentPeriodEnd: toDate(sub.currentPeriodEnd),
    overageAllowed: false,
    cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
    polarModifiedAt: toDate(sub.modifiedAt),
  }
}

export function mapSubscriptionAddonSnapshot(
  sub: PolarSubscriptionData,
  status: string,
): SubscriptionAddonSnapshot | null {
  const orgId = resolveOrgId(sub)
  const kind = sub.product?.metadata?.addon
  const rawUnits = sub.product?.metadata?.units
  let units = Number.NaN
  if (typeof rawUnits === 'number') {
    units = rawUnits
  } else if (typeof rawUnits === 'string') {
    units = Number.parseInt(rawUnits, 10)
  }
  if (
    !(
      orgId &&
      isSubscriptionAddonKind(kind) &&
      units === CUSTOM_DOMAIN_ADDON.units
    )
  ) {
    return null
  }
  return {
    orgId,
    polarSubscriptionId: sub.id,
    kind,
    units,
    status,
    currentPeriodStart: toDate(sub.currentPeriodStart),
    currentPeriodEnd: toDate(sub.currentPeriodEnd),
    cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
    polarModifiedAt: toDate(sub.modifiedAt),
  }
}
