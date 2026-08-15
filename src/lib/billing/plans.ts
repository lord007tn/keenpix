// Code-defined plan catalog — the single source of truth for what each cloud
// tier includes. Read at request time for quota enforcement (checkOrgQuota) and
// written onto Subscription rows from Polar webhooks. Keyed by the `plan`
// metadata stamped on each Polar product (basic/pro/business). An org with no
// active subscription resolves to `null` (no included usage → gated in cloud).

export type PlanId = 'basic' | 'pro' | 'business'
export type PricingPhase = 'founding' | 'standard'

export const FOUNDING_CUSTOMER_LIMIT = 25

export interface Plan {
  advancedAnalytics: boolean
  // Full log history + search (true) vs. the most-recent window only (false).
  advancedLogs: boolean
  aiCreditsPerMonth: number
  // null = unlimited, 0 = none
  customDomains: number | null
  // Maximum query window for aggregate analytics.
  historyDays: number
  id: PlanId
  includedBandwidthBytes: number
  // Raw request-log query and storage window. Kept separate from aggregate
  // analytics so lower tiers do not retain expensive event detail unnecessarily.
  logRetentionDays: number
  // null = unlimited
  maxProjects: number | null
  // null = unlimited. Team size is never a pricing dimension.
  maxSeats: number | null
  name: string
  overagePerGbCents: number
  priceMonthlyUsd: number
}

const GB = 1024 ** 3

export const PLANS: Record<PlanId, Plan> = {
  basic: {
    id: 'basic',
    name: 'Basic',
    priceMonthlyUsd: 9,
    includedBandwidthBytes: 100 * GB,
    overagePerGbCents: 8,
    aiCreditsPerMonth: 0,
    maxProjects: 5,
    maxSeats: null,
    advancedAnalytics: false,
    advancedLogs: false,
    customDomains: 0,
    historyDays: 90,
    logRetentionDays: 30,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthlyUsd: 19,
    includedBandwidthBytes: 400 * GB,
    overagePerGbCents: 6,
    aiCreditsPerMonth: 0,
    maxProjects: 25,
    maxSeats: null,
    advancedAnalytics: true,
    advancedLogs: true,
    customDomains: 1,
    historyDays: 365,
    logRetentionDays: 90,
  },
  business: {
    id: 'business',
    name: 'Business',
    priceMonthlyUsd: 39,
    includedBandwidthBytes: 1000 * GB,
    overagePerGbCents: 5,
    aiCreditsPerMonth: 0,
    maxProjects: null,
    maxSeats: null,
    advancedAnalytics: true,
    advancedLogs: true,
    // A finite allowance keeps Cloudflare's per-hostname cost bounded while
    // still covering agencies managing many client sites.
    customDomains: 10,
    historyDays: 365,
    logRetentionDays: 365,
  },
}

export const STANDARD_PLAN_PRICES: Record<
  PlanId,
  { overagePerGbCents: number; priceMonthlyUsd: number }
> = {
  basic: { priceMonthlyUsd: 9, overagePerGbCents: 12 },
  pro: { priceMonthlyUsd: 29, overagePerGbCents: 9 },
  business: { priceMonthlyUsd: 69, overagePerGbCents: 7 },
}

export function getPlanCommercialTerms(planId: PlanId, phase: PricingPhase) {
  if (phase === 'standard') {
    return STANDARD_PLAN_PRICES[planId]
  }
  return {
    priceMonthlyUsd: PLANS[planId].priceMonthlyUsd,
    overagePerGbCents: PLANS[planId].overagePerGbCents,
  }
}

export interface PricePoint {
  amountCents: number
  currency: string
}

// Displayed pricing per plan for both billing intervals. `source` marks whether
// the amounts came from live Polar products or this code catalog, so the UI can
// render real charges when available and never blank when Polar is unreachable.
export interface PlanPricing {
  foundingOffer: {
    active: boolean
    claimed: number
    limit: number
    remaining: number
  }
  phase: PricingPhase
  plans: Record<PlanId, { month: PricePoint; overagePerGbCents: number }>
  source: 'catalog' | 'polar'
}

// Monthly pricing derived from this catalog. Used in self-host and whenever live
// Polar prices are unavailable so prices never render blank.
export function catalogPricing(
  phase: PricingPhase = 'standard',
  claimed = 0,
): PlanPricing {
  const plans = {} as PlanPricing['plans']
  for (const id of Object.keys(PLANS) as PlanId[]) {
    const terms = getPlanCommercialTerms(id, phase)
    plans[id] = {
      month: { amountCents: terms.priceMonthlyUsd * 100, currency: 'usd' },
      overagePerGbCents: terms.overagePerGbCents,
    }
  }
  const boundedClaimed =
    phase === 'standard'
      ? Math.max(FOUNDING_CUSTOMER_LIMIT, claimed)
      : Math.max(0, claimed)
  const remaining = Math.max(0, FOUNDING_CUSTOMER_LIMIT - boundedClaimed)
  return {
    source: 'catalog',
    phase,
    foundingOffer: {
      active: phase === 'founding' && remaining > 0,
      claimed: boundedClaimed,
      limit: FOUNDING_CUSTOMER_LIMIT,
      remaining,
    },
    plans,
  }
}

// Free-trial guardrails: a trial gets the chosen plan's full features with a
// bounded blast radius. Trial usage is never metered to Polar (the usage cron
// skips trialing orgs), so the serving cap here is the platform's total
// bandwidth exposure per trial.
export const TRIAL = {
  days: 14,
  maxProjects: 2,
  bandwidthBytes: 20 * GB,
} as const

// The most-recent-only log window shown to plans without advanced logs (and the
// self-host default is unlimited, so this only applies to gated cloud tiers).
export const BASIC_LOG_LIMIT = 200

export const DEFAULT_HISTORY_DAYS = 90
export const DEFAULT_LOG_RETENTION_DAYS = 30

export function isPlanId(value: unknown): value is PlanId {
  return value === 'basic' || value === 'pro' || value === 'business'
}

export function getPlan(planId: string | null | undefined): Plan | null {
  return isPlanId(planId) ? PLANS[planId] : null
}
