import { describe, expect, it } from 'vitest'
import {
  blogListingJsonLd,
  blogPostingJsonLd,
  comparisonListingJsonLd,
  comparisonPageJsonLd,
  docsJsonLd,
  homePageJsonLd,
  organizationJsonLd,
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

  it('attributes cards to the founder and the verified brand X account', () => {
    const meta = seo({ title: 'Article title' })

    expect(meta).toContainEqual({
      name: 'twitter:creator',
      content: '@raedbahriworld',
    })
    expect(meta).toContainEqual({
      name: 'twitter:site',
      content: '@getkeenpix',
    })
    expect(organizationJsonLd().sameAs).toContain('https://x.com/getkeenpix')
    expect(organizationJsonLd().founder.sameAs).toContain(
      'https://x.com/raedbahriworld',
    )
  })

  it('emits the matching Open Graph and JSON-LD language for Arabic posts', () => {
    expect(seo({ title: 'مقال تقني', locale: 'ar_AR' })).toContainEqual({
      property: 'og:locale',
      content: 'ar_AR',
    })

    const [article] = blogPostingJsonLd({
      author: 'Raed Bahri',
      datePublished: '2026-08-15',
      description: 'شرح تقني',
      image: 'https://keenpix.com/og/blog/ar/article.png',
      language: 'ar',
      path: [],
      title: 'مقال تقني',
      url: 'https://keenpix.com/blog/ar/article',
    })

    expect(article.inLanguage).toBe('ar')
    const listing = blogListingJsonLd([], 'ar')
    expect(listing.url).toBe('http://localhost:3000/blog/ar')
    expect(listing['@id']).toBe('http://localhost:3000/blog/ar#blog')
  })

  it('builds a sourced comparison graph without FAQ rich-result markup', () => {
    const graph = comparisonPageJsonLd({
      dateModified: '2026-08-18',
      description: 'A source-backed product comparison.',
      name: 'Keenpix vs Example',
      path: [
        { name: 'Keenpix', url: 'http://localhost:3000/' },
        { name: 'Compare', url: 'http://localhost:3000/compare' },
      ],
      url: 'http://localhost:3000/compare/example-alternative',
    })

    expect(graph[0]).toMatchObject({
      '@type': 'WebPage',
      dateModified: '2026-08-18',
      url: 'http://localhost:3000/compare/example-alternative',
    })
    expect(JSON.stringify(graph)).not.toContain('FAQPage')
  })

  it('lists every comparison as a CollectionPage item', () => {
    const graph = comparisonListingJsonLd([
      {
        name: 'Keenpix vs Example',
        url: 'http://localhost:3000/compare/example-alternative',
      },
    ])
    const list = graph.find((node) => node['@type'] === 'ItemList')

    expect(graph[0]).toMatchObject({ '@type': 'CollectionPage' })
    expect(list).toMatchObject({ numberOfItems: 1 })
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

  it('describes undated documentation as a WebPage instead of an Article', () => {
    const [page] = docsJsonLd({
      description: 'Configure a self-hosted Keenpix deployment.',
      path: [],
      title: 'Self-hosting',
      url: 'https://keenpix.com/docs/self-hosting',
    })

    expect(page).toEqual(
      expect.objectContaining({
        '@type': 'WebPage',
        name: 'Self-hosting',
        url: 'https://keenpix.com/docs/self-hosting',
      }),
    )
    expect(page).not.toHaveProperty('datePublished')
    expect(page).not.toHaveProperty('headline')
  })

  it('reports the three monthly managed plans with a numeric count', () => {
    expect(softwareApplicationJsonLd().offers.offerCount).toBe(3)
    expect(softwareApplicationJsonLd().offers.highPrice).toBe('69')

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
