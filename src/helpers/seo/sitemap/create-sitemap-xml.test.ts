import { describe, expect, it } from 'vitest'
import { createSitemapXml } from './create-sitemap-xml'

describe('createSitemapXml', () => {
  it('emits lastmod only when durable update data exists', () => {
    const sitemap = createSitemapXml([
      { url: 'https://keenpix.com/' },
      {
        lastmod: '2026-07-10',
        url: 'https://keenpix.com/blog/example',
      },
    ])

    expect(sitemap).toContain('<loc>https://keenpix.com/</loc>')
    expect(sitemap.match(/<lastmod>/g)).toHaveLength(1)
    expect(sitemap).toContain('<lastmod>2026-07-10</lastmod>')
    expect(sitemap).not.toContain('<changefreq>')
    expect(sitemap).not.toContain('<priority>')
  })

  it('escapes sitemap locations as XML', () => {
    const sitemap = createSitemapXml([
      { url: 'https://keenpix.com/search?q=avif&format=webp' },
    ])

    expect(sitemap).toContain(
      '<loc>https://keenpix.com/search?q=avif&amp;format=webp</loc>',
    )
  })

  it('emits escaped reciprocal language alternates', () => {
    const sitemap = createSitemapXml([
      {
        alternates: [
          { hreflang: 'en', url: 'https://keenpix.com/blog/cache?a=1&b=2' },
          { hreflang: 'ar', url: 'https://keenpix.com/blog/ar/cache' },
          {
            hreflang: 'x-default',
            url: 'https://keenpix.com/blog/cache',
          },
        ],
        url: 'https://keenpix.com/blog/cache',
      },
    ])

    expect(sitemap).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"')
    expect(sitemap).toContain(
      '<xhtml:link rel="alternate" hreflang="en" href="https://keenpix.com/blog/cache?a=1&amp;b=2" />',
    )
    expect(sitemap).toContain(
      '<xhtml:link rel="alternate" hreflang="ar" href="https://keenpix.com/blog/ar/cache" />',
    )
    expect(sitemap).toContain(
      '<xhtml:link rel="alternate" hreflang="x-default" href="https://keenpix.com/blog/cache" />',
    )
  })
})
