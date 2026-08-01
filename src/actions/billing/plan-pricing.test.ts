import { afterEach, describe, expect, it, vi } from 'vitest'

const createPolarClient = vi.hoisted(() => vi.fn())
vi.mock('@/lib/billing/polar-client', () => ({ createPolarClient }))
vi.mock('@/lib/logger/logger', () => ({
  errorContext: (error: unknown) => ({ error }),
  logger: { warn: vi.fn() },
}))

// getPlanPricing memoizes in-process, so load a fresh module per test to reset the
// cache and single-flight state.
async function loadGetPlanPricing() {
  vi.resetModules()
  const mod = await import('./plan-pricing')
  return mod.getPlanPricing
}

interface FakePrice {
  amountType: string
  isArchived?: boolean
  priceAmount?: number
  priceCurrency?: string
}

function fixed(amountCents: number): FakePrice {
  return {
    amountType: 'fixed',
    isArchived: false,
    priceAmount: amountCents,
    priceCurrency: 'usd',
  }
}

function fakeProduct(plan: string, interval: string, prices: FakePrice[]) {
  return {
    id: `prod_${plan}_${interval}`,
    metadata: { plan, interval },
    prices,
  }
}

// Mirrors the SDK usage: `await client.products.list(...)` then `for await` pages.
// One page, exposed as a manual async iterator (no async generator, so it doesn't
// trip the "async without await" lint).
function fakeClient(products: unknown[]) {
  return {
    products: {
      list: () => ({
        [Symbol.asyncIterator]() {
          let sent = false
          return {
            next() {
              if (sent) {
                return Promise.resolve({ done: true, value: undefined })
              }
              sent = true
              return Promise.resolve({
                done: false,
                value: { result: { items: products } },
              })
            },
          }
        },
      }),
    },
  }
}

const FULL_CATALOG = [
  fakeProduct('basic', 'month', [fixed(900)]),
  fakeProduct('pro', 'month', [fixed(1900)]),
  fakeProduct('business', 'month', [fixed(2900)]),
  // Archived dashboard records may remain readable, but an annual product must
  // never influence displayed pricing or become a checkout option.
  fakeProduct('pro', 'year', [fixed(19_000)]),
]

afterEach(() => {
  vi.clearAllMocks()
})

describe('getPlanPricing', () => {
  it('falls back to the catalog when Polar is not configured', async () => {
    createPolarClient.mockReturnValue(null)
    const getPlanPricing = await loadGetPlanPricing()
    const pricing = await getPlanPricing()
    expect(pricing.source).toBe('catalog')
    expect(pricing.plans.pro.month.amountCents).toBe(1900)
  })

  it('sources monthly prices from Polar products', async () => {
    createPolarClient.mockReturnValue(fakeClient(FULL_CATALOG))
    const getPlanPricing = await loadGetPlanPricing()
    const pricing = await getPlanPricing()
    expect(pricing.source).toBe('polar')
    expect(pricing.plans.pro.month.amountCents).toBe(1900)
  })

  it('picks the fixed price and ignores free/non-fixed prices', async () => {
    const withFree = [
      fakeProduct('basic', 'month', [
        { amountType: 'free', isArchived: false },
        fixed(900),
      ]),
      ...FULL_CATALOG.filter(
        (p) =>
          !(p.metadata.plan === 'basic' && p.metadata.interval === 'month'),
      ),
    ]
    createPolarClient.mockReturnValue(fakeClient(withFree))
    const getPlanPricing = await loadGetPlanPricing()
    const pricing = await getPlanPricing()
    expect(pricing.source).toBe('polar')
    expect(pricing.plans.basic.month.amountCents).toBe(900)
  })

  it('falls back to the catalog when a monthly plan has no fixed price', async () => {
    const incomplete = FULL_CATALOG.filter(
      (p) => !(p.metadata.plan === 'pro' && p.metadata.interval === 'month'),
    )
    createPolarClient.mockReturnValue(fakeClient(incomplete))
    const getPlanPricing = await loadGetPlanPricing()
    const pricing = await getPlanPricing()
    expect(pricing.source).toBe('catalog')
  })

  it('caches in-process so repeated calls hit Polar once', async () => {
    const client = fakeClient(FULL_CATALOG)
    const listSpy = vi.spyOn(client.products, 'list')
    createPolarClient.mockReturnValue(client)
    const getPlanPricing = await loadGetPlanPricing()
    await getPlanPricing()
    await getPlanPricing()
    expect(listSpy).toHaveBeenCalledTimes(1)
    expect(createPolarClient).toHaveBeenCalledTimes(1)
  })
})
