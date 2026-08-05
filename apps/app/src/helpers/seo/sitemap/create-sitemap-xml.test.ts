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
})
