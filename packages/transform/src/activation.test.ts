import { describe, expect, it } from 'vitest'
import { isActivationDelivery, isExternalImageSource } from './activation'

describe('activation request eligibility', () => {
  it('accepts ordinary GET delivery without relying on Google consent', () => {
    for (const consent of ['denied', 'granted', 'withdrawn']) {
      expect(
        isActivationDelivery(
          new Request('https://cdn.example.test/img/image', {
            headers: {
              cookie: `keenpix_analytics_consent=${consent}`,
              referer: 'https://customer.example.test/page',
            },
          }),
          'https://keenpix.com',
        ),
      ).toBe(true)
    }
  })

  it.each([
    { method: 'HEAD' },
    { method: 'POST' },
    { headers: new Headers({ 'x-keenpix-request-purpose': 'preview' }) },
    { headers: new Headers({ 'x-keenpix-request-purpose': 'test' }) },
    { headers: new Headers({ purpose: 'prefetch' }) },
    { headers: new Headers({ 'sec-purpose': 'prefetch;prerender' }) },
    {
      headers: new Headers({
        referer: 'https://www.keenpix.com/app/dashboard?private=value',
      }),
    },
    { headers: new Headers({ referer: 'invalid' }) },
  ])('excludes non-delivery request %j', (init) => {
    expect(
      isActivationDelivery(
        new Request('https://cdn.example.test/img/image', init),
        'https://keenpix.com',
      ),
    ).toBe(false)
  })

  it('excludes explicit preview URLs even without a referrer', () => {
    expect(
      isActivationDelivery(
        new Request('https://cdn.example.test/img/image?__keenpix_preview=1'),
        'https://keenpix.com',
      ),
    ).toBe(false)
  })
})

describe('external image source policy', () => {
  it.each([
    'keenpix.com',
    'www.keenpix.com',
    'cdn.keenpix.com',
    'a.b.keenpix.com',
    'CDN.KeenPix.COM',
    'keenpix.com.',
    'cdn.keenpix.com..',
    'app.example.test',
    'APP.example.test',
    'www.app.example.test',
  ])('treats %s as Keenpix-owned', (host) => {
    expect(isExternalImageSource(host, 'https://app.example.test')).toBe(false)
  })

  it.each([
    'images.customer.test',
    'notkeenpix.com',
    'keenpix.com.customer.test',
    'keenpix.co',
    'other.app.example.test',
  ])('treats %s as external', (host) => {
    expect(isExternalImageSource(host, 'https://app.example.test')).toBe(true)
  })

  it('does not qualify a source whose host is unknown', () => {
    for (const host of [undefined, null, '', '.']) {
      expect(isExternalImageSource(host, 'https://app.example.test')).toBe(
        false,
      )
    }
  })
})
