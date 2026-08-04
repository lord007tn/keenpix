import { PLANS, type PlanId } from '@/lib/billing/plans'

// Single source of truth for the marketing plan cards, shared by the landing
// page (#pricing) and /pricing so the two can never drift apart. Cumulative
// ("Everything in X, plus") so each card reads as an upgrade path instead of
// three near-identical lists; every number derives from the plans catalog.
const GB = 1024 ** 3

function gb(bytes: number): string {
  const value = bytes / GB
  return value >= 1000 ? `${value / 1000} TB` : `${value} GB`
}

export const PLAN_CARD_ORDER: PlanId[] = ['basic', 'pro', 'business']

export const PLAN_TAGLINES: Record<PlanId, string> = {
  basic: 'For a site or store getting started.',
  pro: 'For production sites with real traffic.',
  business: 'One plan for all your client sites.',
}

const PLAN_CARD_FEATURES: Record<
  PlanId,
  { features: Array<string | null>; lead?: string }
> = {
  basic: {
    features: [
      `${gb(PLANS.basic.includedBandwidthBytes)} managed delivery / month`,
      'Unlimited transforms — AVIF, WebP + 6 more formats',
      'Unlimited team members',
      `${PLANS.basic.maxProjects} projects`,
      'Bandwidth-saved, cache-hit & top-image analytics',
      `Live request logs · ${PLANS.basic.logRetentionDays}-day retention`,
      'Signed URLs + per-project allowlists',
      null,
    ],
  },
  pro: {
    lead: 'Everything in Basic, plus:',
    features: [
      `${gb(PLANS.pro.includedBandwidthBytes)} managed delivery / month`,
      'Advanced analytics — geo, latency percentiles, 365-day history',
      `Full log search · ${PLANS.pro.logRetentionDays}-day retention`,
      `${PLANS.pro.maxProjects} projects`,
      `${PLANS.pro.customDomains} custom delivery domain`,
      null,
    ],
  },
  business: {
    lead: 'Everything in Pro, plus:',
    features: [
      `${gb(PLANS.business.includedBandwidthBytes)} managed delivery / month`,
      'Unlimited projects',
      `${PLANS.business.customDomains} custom delivery domains`,
      'Add 5 more custom domains for $5/month',
      `${PLANS.business.logRetentionDays}-day log retention`,
      null,
    ],
  },
}

export function getPlanCardFeatures(planId: PlanId, overagePerGbCents: number) {
  const card = PLAN_CARD_FEATURES[planId]
  const overage = `$${(overagePerGbCents / 100).toFixed(2)}/GB`
  let overageLabel = `Lowest overage · ${overage}, billed monthly`
  if (planId === 'basic') {
    overageLabel = `Always-on overage · ${overage}`
  } else if (planId === 'pro') {
    overageLabel = `Cheaper overage · ${overage}, billed monthly`
  }
  return {
    ...card,
    features: card.features.map((feature) => feature ?? overageLabel),
  }
}
