import { countFoundingCustomers } from '@/data-access/subscriptions'
import {
  catalogPricing,
  FOUNDING_CUSTOMER_LIMIT,
  isPlanId,
  PLANS,
  type PlanId,
  type PlanPricing,
  type PricePoint,
  type PricingPhase,
} from '@/lib/billing/plans'
import { createPolarClient } from '@/lib/billing/polar-client'
import { errorContext, logger } from '@/lib/logger/logger'

type Collected = Partial<
  Record<PlanId, PricePoint & { overagePerGbCents: number }>
>

const POLAR_TIMEOUT_MS = 3000
const POLAR_TTL_MS = 10 * 60 * 1000
const FALLBACK_TTL_MS = 30 * 1000

const cache = new Map<
  PricingPhase,
  { at: number; plans: PlanPricing['plans']; source: PlanPricing['source'] }
>()
const inFlight = new Map<
  PricingPhase,
  Promise<{
    plans: PlanPricing['plans']
    source: PlanPricing['source']
  }>
>()

function productPhase(metadata: Record<string, unknown> | null | undefined) {
  return metadata?.pricing_phase === 'standard' ? 'standard' : 'founding'
}

async function resolveFromPolar(phase: PricingPhase) {
  const client = createPolarClient()
  if (!client) {
    return null
  }
  const collected: Collected = {}
  const duplicates = new Set<PlanId>()
  const iterator = await client.products.list({ isArchived: false, limit: 100 })
  for await (const page of iterator) {
    for (const product of page.result.items) {
      const plan = product.metadata?.plan
      if (
        !(
          typeof plan === 'string' &&
          isPlanId(plan) &&
          product.metadata?.interval === 'month' &&
          productPhase(product.metadata) === phase
        )
      ) {
        continue
      }
      const fixedPrice = product.prices.find(
        (price) => !price.isArchived && price.amountType === 'fixed',
      )
      const meteredPrice = product.prices.find(
        (price) => !price.isArchived && price.amountType === 'metered_unit',
      )
      if (
        !fixedPrice ||
        fixedPrice.amountType !== 'fixed' ||
        !meteredPrice ||
        meteredPrice.amountType !== 'metered_unit'
      ) {
        continue
      }
      if (collected[plan]) {
        duplicates.add(plan)
        continue
      }
      collected[plan] = {
        amountCents: fixedPrice.priceAmount,
        currency: fixedPrice.priceCurrency,
        overagePerGbCents: Number(meteredPrice.unitAmount),
      }
    }
  }
  if (duplicates.size > 0) {
    return null
  }
  const plans = {} as PlanPricing['plans']
  for (const id of Object.keys(PLANS) as PlanId[]) {
    const price = collected[id]
    if (!(price && Number.isFinite(price.overagePerGbCents))) {
      return null
    }
    plans[id] = {
      month: {
        amountCents: price.amountCents,
        currency: price.currency,
      },
      overagePerGbCents: price.overagePerGbCents,
    }
  }
  return plans
}

function resolveFromPolarBounded(phase: PricingPhase) {
  const live = resolveFromPolar(phase).catch((error) => {
    logger.warn(
      errorContext(error),
      `plan pricing: Polar ${phase} lookup failed, falling back to catalog`,
    )
    return null
  })
  const timeout = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), POLAR_TIMEOUT_MS).unref?.()
  })
  return Promise.race([live, timeout])
}

function getPriceCatalog(phase: PricingPhase) {
  const cached = cache.get(phase)
  if (cached) {
    const ttl = cached.source === 'polar' ? POLAR_TTL_MS : FALLBACK_TTL_MS
    if (Date.now() - cached.at < ttl) {
      return Promise.resolve({ plans: cached.plans, source: cached.source })
    }
  }
  const pending = inFlight.get(phase)
  if (pending) {
    return pending
  }
  const request = resolveFromPolarBounded(phase)
    .then((polar) => {
      if (polar) {
        return { plans: polar, source: 'polar' as const }
      }
      const fallback = catalogPricing(phase)
      return { plans: fallback.plans, source: fallback.source }
    })
    .then((value) => {
      cache.set(phase, { at: Date.now(), ...value })
      return value
    })
    .finally(() => {
      inFlight.delete(phase)
    })
  inFlight.set(phase, request)
  return request
}

export async function getPlanPricing() {
  // Fail closed on a database error: showing standard pricing cannot consume an
  // extra founding slot, while assuming zero paid customers could.
  const claimed = await countFoundingCustomers().catch((error) => {
    logger.warn(
      errorContext(error),
      'plan pricing: founding customer count unavailable; using standard pricing',
    )
    return FOUNDING_CUSTOMER_LIMIT
  })
  const remaining = Math.max(0, FOUNDING_CUSTOMER_LIMIT - claimed)
  const phase: PricingPhase = remaining > 0 ? 'founding' : 'standard'
  const catalog = await getPriceCatalog(phase)
  return {
    ...catalog,
    phase,
    foundingOffer: {
      active: remaining > 0,
      claimed,
      limit: FOUNDING_CUSTOMER_LIMIT,
      remaining,
    },
  }
}
