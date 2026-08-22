import { describe, expect, it } from 'vitest'
import { getCanonicalRedirect } from './canonical-redirect'

describe('getCanonicalRedirect', () => {
  it('permanently canonicalizes public page paths while preserving queries', () => {
    expect(
      getCanonicalRedirect(
        'GET',
        new URL('https://keenpix.com/blog/ar/?ref=search'),
      ),
    ).toBe('/blog/ar?ref=search')
    expect(
      getCanonicalRedirect('HEAD', new URL('https://keenpix.com/docs/')),
    ).toBe('/docs')
    expect(
      getCanonicalRedirect(
        'GET',
        new URL('https://keenpix.com/BLOG//What-Is-An-Image-CDN?ref=search'),
      ),
    ).toBe('/blog/what-is-an-image-cdn?ref=search')
    expect(
      getCanonicalRedirect(
        'GET',
        new URL('https://keenpix.com//compare//cloudinary-alternative'),
      ),
    ).toBe('/compare/cloudinary-alternative')
    expect(
      getCanonicalRedirect(
        'GET',
        new URL('https://keenpix.com/IMAGE-CDN-COST-CALCULATOR/'),
      ),
    ).toBe('/image-cdn-cost-calculator')
  })

  it('leaves the root, non-idempotent requests, and opaque paths untouched', () => {
    expect(
      getCanonicalRedirect('GET', new URL('https://keenpix.com/')),
    ).toBeUndefined()
    expect(
      getCanonicalRedirect('POST', new URL('https://keenpix.com/blog/')),
    ).toBeUndefined()
    expect(
      getCanonicalRedirect(
        'GET',
        new URL('https://keenpix.com/p/project/https://example.com/'),
      ),
    ).toBeUndefined()
    expect(
      getCanonicalRedirect(
        'GET',
        new URL('https://keenpix.com/api/keenpix/https://example.com/'),
      ),
    ).toBeUndefined()
    expect(
      getCanonicalRedirect(
        'GET',
        new URL('https://keenpix.com/invite/CaseSensitiveToken'),
      ),
    ).toBeUndefined()
  })
})
