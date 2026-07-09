import {
  catalogPricing,
  isPlanId,
  PLANS,
  type PlanId,
  type PlanPricing,
  type PricePoint,
} from '@/lib/billing/plans'
import { createPolarClient } from '@/lib/billing/polar-client'
import { errorContext, logger } from '@/lib/logger/logger'

type Interval = 'month' | 'year'
type Collected = Partial<Record<PlanId, Partial<Record<Interval, PricePoint>>>>

// Bound the live Polar lookup so a slow/hung call can't stall the public
// marketing SSR — fall back to the catalog instead.
const POLAR_TIMEOUT_MS = 3000
// Cache live prices long (they rarely change); cache the catalog fallback briefly
// so a transient Polar outage self-heals on the next request rather than sticking.
const POLAR_TTL_MS = 10 * 60 * 1000
const FALLBACK_TTL_MS = 30 * 1000

let cache: { at: number; value: PlanPricing } | null = null
let inFlight: Promise<PlanPricing> | null = null

// Read the headline (fixed) price + interval off each Polar subscription product,
// keyed by its `plan` + `interval` metadata (the same metadata resolveProducts
// uses to build checkout slugs). Returns null — signalling "use the catalog" — if
// Polar is unconfigured, or if any plan/interval is missing a fixed price (a
// partial map would render some cards from Polar and some blank).
async function resolveFromPolar(): Promise<PlanPricing | null> {
  const client = createPolarClient()
  if (!client) {
    return null
  }
  const collected: Collected = {}
  const iterator = await client.products.list({ isArchived: false, limit: 100 })
  for await (const page of iterator) {
    for (const product of page.result.items) {
      const plan = product.metadata?.plan
      const interval = product.metadata?.interval
      if (!(typeof plan === 'string' && isPlanId(plan))) {
        continue
      }
      if (interval !== 'month' && interval !== 'year') {
        continue
      }
      // Only a plain fixed price carries a headline amount; skip
      // free/custom/metered/seat-based prices.
      const price = product.prices.find(
        (p) => !p.isArchived && p.amountType === 'fixed',
      )
      if (!price || price.amountType !== 'fixed') {
        continue
      }
      const forPlan = collected[plan] ?? {}
      collected[plan] = forPlan
      forPlan[interval] = {
        amountCents: price.priceAmount,
        currency: price.priceCurrency,
      }
    }
  }
  const plans = {} as PlanPricing['plans']
  for (const id of Object.keys(PLANS) as PlanId[]) {
    const month = collected[id]?.month
    const year = collected[id]?.year
    if (!(month && year)) {
      return null
    }
    plans[id] = { month, year }
  }
  return { source: 'polar', plans }
}

function resolveFromPolarBounded(): Promise<PlanPricing | null> {
  // Own .catch so a late rejection (after the timeout already won the race) can't
  // surface as an unhandled rejection.
  const live = resolveFromPolar().catch((error) => {
    logger.warn(
      errorContext(error),
      'plan pricing: Polar lookup failed, falling back to catalog',
    )
    return null
  })
  const timeout = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), POLAR_TIMEOUT_MS).unref?.()
  })
  return Promise.race([live, timeout])
}

// Displayed plan pricing, sourced from live Polar products so the marketing and
// checkout cards never diverge from the real charge, with the code catalog as the
// offline/self-host fallback. Cached in-process and single-flighted so the public
// marketing page never triggers a Polar call per visit or a request stampede.
export function getPlanPricing(): Promise<PlanPricing> {
  const now = Date.now()
  if (cache) {
    const ttl = cache.value.source === 'polar' ? POLAR_TTL_MS : FALLBACK_TTL_MS
    if (now - cache.at < ttl) {
      return Promise.resolve(cache.value)
    }
  }
  if (inFlight) {
    return inFlight
  }
  inFlight = resolveFromPolarBounded()
    .then((polar) => polar ?? catalogPricing())
    .then((value) => {
      cache = { at: Date.now(), value }
      return value
    })
    .finally(() => {
      inFlight = null
    })
  return inFlight
}
