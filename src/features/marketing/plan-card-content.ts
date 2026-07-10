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

function overage(planId: PlanId): string {
  return `$${(PLANS[planId].overagePerGbCents / 100).toFixed(2)}`
}

export const PLAN_CARD_ORDER: PlanId[] = ['basic', 'pro', 'business']

export const PLAN_TAGLINES: Record<PlanId, string> = {
  basic: 'For a site or store getting started.',
  pro: 'For production sites with real traffic.',
  business: 'One plan for all your client sites.',
}

export const PLAN_CARD_FEATURES: Record<
  PlanId,
  { features: string[]; lead?: string }
> = {
  basic: {
    features: [
      `${gb(PLANS.basic.includedBandwidthBytes)} delivered / month`,
      'Unlimited transforms — AVIF, WebP + 6 more formats',
      `${PLANS.basic.maxProjects} projects`,
      'Bandwidth-saved, cache-hit & top-image analytics',
      `Live request logs · ${PLANS.basic.logRetentionDays}-day retention`,
      'Signed URLs + per-project allowlists',
      `Spending cap on by default · ${overage('basic')}/GB overage`,
    ],
  },
  pro: {
    lead: 'Everything in Basic, plus:',
    features: [
      `${gb(PLANS.pro.includedBandwidthBytes)} delivered / month`,
      'Advanced analytics — geo, latency percentiles, full history',
      `Full log search · ${PLANS.pro.logRetentionDays}-day retention`,
      `${PLANS.pro.maxProjects} projects`,
      `Cheaper overage · ${overage('pro')}/GB, hard-capped`,
    ],
  },
  business: {
    lead: 'Everything in Pro, plus:',
    features: [
      `${gb(PLANS.business.includedBandwidthBytes)} delivered / month`,
      'Unlimited projects',
      `${PLANS.business.logRetentionDays}-day log retention`,
      `Lowest overage · ${overage('business')}/GB, hard-capped`,
    ],
  },
}
