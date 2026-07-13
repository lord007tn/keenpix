import { describe, expect, it } from 'vitest'
import {
  blogPostingJsonLd,
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

  it('publishes the real social-image MIME type after removing version queries', () => {
    expect(
      seo({
        title: 'JPEG article',
        image: 'https://keenpix.com/editorial/article-og.jpg?v=2026-07-13',
      }),
    ).toContainEqual({ property: 'og:image:type', content: 'image/jpeg' })
    expect(
      seo({
        title: 'PNG article',
        image: 'https://keenpix.com/og/article.png',
      }),
    ).toContainEqual({ property: 'og:image:type', content: 'image/png' })
  })

  it('links article authors to the Person entity on their profile page', () => {
    const [article] = blogPostingJsonLd({
      author: 'Raed Bahri',
      datePublished: '2026-07-13',
      description: 'A code-backed case study.',
      image: 'https://keenpix.com/editorial/article-og.jpg',
      path: [],
      title: 'Case study',
      url: 'https://keenpix.com/blog/case-study',
    })

    expect(article.author).toEqual(
      expect.objectContaining({
        '@id': 'http://localhost:3000/authors/raed-bahri#person',
      }),
    )
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

  it('reports the three monthly managed plans with a numeric count', () => {
    expect(softwareApplicationJsonLd().offers.offerCount).toBe(3)
    expect(softwareApplicationJsonLd().offers.highPrice).toBe('29')

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
    expect(catalog).toEqual(expect.objectContaining({ numberOfItems: 3 }))
    expect(offers).toHaveLength(3)
    expect(offers.map((offer: { name: string }) => offer.name)).toEqual([
      'Basic monthly',
      'Pro monthly',
      'Business monthly',
    ])
  })
})
