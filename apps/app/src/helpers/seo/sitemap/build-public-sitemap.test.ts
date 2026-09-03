import { describe, expect, it } from 'vitest'
import { buildPublicSitemap } from './build-public-sitemap'

describe('public sitemap', () => {
  it('publishes the English guides without retired locale variants', () => {
    const sitemap = buildPublicSitemap('https://keenpix.com')

    expect(sitemap).toContain(
      '<loc>https://keenpix.com/blog/user-upload-image-pipeline-design</loc>',
    )
    expect(sitemap).toContain(
      '<loc>https://keenpix.com/blog/cache-invalidation-versioned-image-urls</loc>',
    )
    expect(sitemap).not.toContain('/blog/ar')
    expect(sitemap).not.toContain('hreflang="ar"')
  })
})
