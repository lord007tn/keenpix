import type { Polar } from '@polar-sh/sdk'
import { CUSTOM_DOMAIN_ADDON } from '@/lib/billing/addons'
import { isPlanId, type PricingPhase } from '@/lib/billing/plans'

// Resolve the launchable catalog without hardcoding environment-specific Polar
// ids. Annual products are deliberately excluded: Polar uses the subscription
// period as the usage-meter period, while Keenpix's allowances reset monthly.
export async function listCheckoutProducts(
  client: Polar,
  phase: PricingPhase,
): Promise<{ productId: string; slug: string }[]> {
  try {
    const products = new Map<string, string>()
    const iterator = await client.products.list({
      isArchived: false,
      limit: 100,
    })
    for await (const page of iterator) {
      for (const product of page.result.items) {
        const plan = product.metadata?.plan
        const interval = product.metadata?.interval
        if (
          typeof plan === 'string' &&
          isPlanId(plan) &&
          interval === 'month' &&
          (product.metadata?.pricing_phase === 'standard'
            ? 'standard'
            : 'founding') === phase
        ) {
          const slug = `${plan}-month`
          if (products.has(slug)) {
            throw new Error(`Duplicate Polar checkout slug: ${slug}`)
          }
          products.set(slug, product.id)
        }
      }
    }
    if (products.size !== 3) {
      throw new Error('Expected exactly three monthly Polar products')
    }
    return [...products].map(([slug, productId]) => ({ productId, slug }))
  } catch {
    return []
  }
}

export async function getCustomDomainAddonProductId(client: Polar) {
  const matches: string[] = []
  const iterator = await client.products.list({
    isArchived: false,
    limit: 100,
  })
  for await (const page of iterator) {
    for (const product of page.result.items) {
      const units = product.metadata?.units
      if (
        product.metadata?.addon === CUSTOM_DOMAIN_ADDON.kind &&
        product.metadata?.interval === 'month' &&
        (units === CUSTOM_DOMAIN_ADDON.units ||
          units === String(CUSTOM_DOMAIN_ADDON.units))
      ) {
        matches.push(product.id)
      }
    }
  }
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one active monthly custom-domain add-on, found ${matches.length}.`,
    )
  }
  return matches[0]
}
