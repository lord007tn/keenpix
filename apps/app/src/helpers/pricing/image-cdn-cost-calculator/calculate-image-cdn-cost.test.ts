import { describe, expect, it } from 'vitest'
import { calculateImageCdnCosts } from './calculate-image-cdn-cost'

describe('calculateImageCdnCosts', () => {
  it('keeps vendors in a stable order and exposes partial estimates', () => {
    const results = calculateImageCdnCosts({
      customDomains: 0,
      deliveredGb: 100,
      projects: 1,
      region: 'eu-na',
      requests: 100_000,
      sourceStorageGb: 10,
      uniqueTransforms: 5000,
    })

    expect(results.map((result) => result.id)).toEqual([
      'keenpix',
      'cloudinary',
      'imgix',
      'imagekit',
      'gumlet',
      'twicpics',
      'cloudflare',
      'bunny',
      'vercel',
      'imgproxy',
    ])
    expect(results.find((result) => result.id === 'keenpix')?.monthly).toBe(9)
    expect(results.find((result) => result.id === 'cloudinary')?.monthly).toBe(
      99,
    )
    expect(results.find((result) => result.id === 'imgproxy')?.status).toBe(
      'partial',
    )
  })

  it('uses the business custom-domain pack when necessary', () => {
    const keenpix = calculateImageCdnCosts({
      customDomains: 12,
      deliveredGb: 900,
      projects: 30,
      region: 'mea',
      requests: 1_000_000,
      sourceStorageGb: 100,
      uniqueTransforms: 20_000,
    }).find((result) => result.id === 'keenpix')

    expect(keenpix?.plan).toBe('Business')
    expect(keenpix?.monthly).toBe(74)
  })

  it('selects the cheapest eligible Keenpix tier instead of the first tier', () => {
    const keenpix = calculateImageCdnCosts({
      customDomains: 0,
      deliveredGb: 400,
      projects: 1,
      region: 'eu-na',
      requests: 500_000,
      sourceStorageGb: 10,
      uniqueTransforms: 10_000,
    }).find((result) => result.id === 'keenpix')

    expect(keenpix?.plan).toBe('Pro')
    expect(keenpix?.monthly).toBe(29)
  })

  it('includes published free tiers when the workload fits', () => {
    const results = calculateImageCdnCosts({
      customDomains: 0,
      deliveredGb: 10,
      projects: 1,
      region: 'eu-na',
      requests: 10_000,
      sourceStorageGb: 2,
      uniqueTransforms: 1000,
    })

    expect(results.find((result) => result.id === 'cloudinary')?.monthly).toBe(
      0,
    )
    expect(results.find((result) => result.id === 'imagekit')?.monthly).toBe(0)
    expect(results.find((result) => result.id === 'twicpics')?.monthly).toBe(19)
  })

  it('models TwicPics bandwidth tiers and domain limits', () => {
    const business = calculateImageCdnCosts({
      customDomains: 1,
      deliveredGb: 100,
      projects: 1,
      region: 'eu-na',
      requests: 100_000,
      sourceStorageGb: 10,
      uniqueTransforms: 5000,
    }).find((result) => result.id === 'twicpics')
    const enterprise = calculateImageCdnCosts({
      customDomains: 10,
      deliveredGb: 100,
      projects: 4,
      region: 'eu-na',
      requests: 100_000,
      sourceStorageGb: 10,
      uniqueTransforms: 5000,
    }).find((result) => result.id === 'twicpics')

    expect(business?.plan).toBe('Business')
    expect(business?.monthly).toBe(49)
    expect(enterprise?.status).toBe('quote')
    expect(enterprise?.monthly).toBeNull()
  })
})
