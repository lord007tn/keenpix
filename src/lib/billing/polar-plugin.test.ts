import type { Polar } from '@polar-sh/sdk'
import { describe, expect, it } from 'vitest'
import {
  getCustomDomainAddonProductId,
  listCheckoutProducts,
} from './polar-checkout-products'

function polarWithProducts(products: unknown[]) {
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
  } as unknown as Polar
}

const monthlyProducts = [
  { id: 'prod_basic_month', metadata: { plan: 'basic', interval: 'month' } },
  { id: 'prod_pro_month', metadata: { plan: 'pro', interval: 'month' } },
  {
    id: 'prod_business_month',
    metadata: { plan: 'business', interval: 'month' },
  },
]
const FOUND_NONE = /found 0/
const FOUND_TWO = /found 2/

describe('listCheckoutProducts', () => {
  it('exposes exactly the three monthly checkout slugs', async () => {
    const products = await listCheckoutProducts(
      polarWithProducts([
        ...monthlyProducts,
        {
          id: 'prod_basic_year',
          metadata: { plan: 'basic', interval: 'year' },
        },
        {
          id: 'prod_unknown',
          metadata: { plan: 'enterprise', interval: 'month' },
        },
        {
          id: 'prod_domains',
          metadata: { addon: 'custom_domains', interval: 'month', units: '5' },
        },
      ]),
    )

    expect(products).toEqual([
      { productId: 'prod_basic_month', slug: 'basic-month' },
      { productId: 'prod_pro_month', slug: 'pro-month' },
      { productId: 'prod_business_month', slug: 'business-month' },
    ])
    expect(products.some((product) => product.slug.endsWith('-year'))).toBe(
      false,
    )
  })

  it('fails closed when a monthly slug is duplicate or missing', async () => {
    await expect(
      listCheckoutProducts(
        polarWithProducts([
          ...monthlyProducts,
          {
            id: 'prod_basic_duplicate',
            metadata: { plan: 'basic', interval: 'month' },
          },
        ]),
      ),
    ).resolves.toEqual([])
    await expect(
      listCheckoutProducts(polarWithProducts(monthlyProducts.slice(0, 2))),
    ).resolves.toEqual([])
  })
})

describe('getCustomDomainAddonProductId', () => {
  it('finds exactly one active monthly five-domain pack', async () => {
    await expect(
      getCustomDomainAddonProductId(
        polarWithProducts([
          ...monthlyProducts,
          {
            id: 'prod_domains',
            metadata: {
              addon: 'custom_domains',
              interval: 'month',
              units: '5',
            },
          },
        ]),
      ),
    ).resolves.toBe('prod_domains')
  })

  it('rejects missing, altered, or duplicate packs', async () => {
    await expect(
      getCustomDomainAddonProductId(polarWithProducts(monthlyProducts)),
    ).rejects.toThrow(FOUND_NONE)
    await expect(
      getCustomDomainAddonProductId(
        polarWithProducts([
          {
            id: 'prod_domains_a',
            metadata: {
              addon: 'custom_domains',
              interval: 'month',
              units: 5,
            },
          },
          {
            id: 'prod_domains_b',
            metadata: {
              addon: 'custom_domains',
              interval: 'month',
              units: '5',
            },
          },
        ]),
      ),
    ).rejects.toThrow(FOUND_TWO)
  })
})
