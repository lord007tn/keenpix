import { describe, expect, it } from 'vitest'
import {
  homePageJsonLd,
  pricingPageJsonLd,
  seo,
  softwareApplicationJsonLd,
} from './seo'

describe('SEO entity graphs', () => {
  it('uses article-specific image alt text for Open Graph and Twitter', () => {
    const meta = seo({
      title: 'Article title',
      image: 'https://keenpix.com/og/blog/article.png',
      imageAlt: 'Diagram showing the article-specific image delivery workflow',
    })

    expect(meta).toContainEqual({
      property: 'og:image:alt',
      content: 'Diagram showing the article-specific image delivery workflow',
    })
    expect(meta).toContainEqual({
      name: 'twitter:image:alt',
      content: 'Diagram showing the article-specific image delivery workflow',
    })
  })

  it('connects the homepage WebPage to the site and software entities', () => {
    expect(homePageJsonLd()).toEqual(
      expect.objectContaining({
        '@type': 'WebPage',
        about: { '@id': 'http://localhost:3000/#software' },
        isPartOf: { '@id': 'http://localhost:3000/#website' },
        mainEntity: { '@id': 'http://localhost:3000/#software' },
        publisher: { '@id': 'http://localhost:3000/#organization' },
      }),
    )
  })

  it('reports the six managed billing combinations with a numeric count', () => {
    expect(softwareApplicationJsonLd().offers.offerCount).toBe(6)

    const graph = pricingPageJsonLd()['@graph']
    const catalog = graph.find((node) => node['@type'] === 'OfferCatalog')
    const offers = Reflect.get(catalog ?? {}, 'itemListElement')

    expect(graph.map((node) => node['@type'])).toEqual(
      expect.arrayContaining([
        'Organization',
        'WebSite',
        'WebPage',
        'SoftwareApplication',
        'OfferCatalog',
      ]),
    )
    expect(catalog).toEqual(expect.objectContaining({ numberOfItems: 6 }))
    expect(offers).toHaveLength(6)
    expect(offers.map((offer: { name: string }) => offer.name)).toEqual([
      'Basic monthly',
      'Basic annual',
      'Pro monthly',
      'Pro annual',
      'Business monthly',
      'Business annual',
    ])
  })
})
