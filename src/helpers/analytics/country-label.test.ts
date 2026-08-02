import { describe, expect, it } from 'vitest'
import { getAnalyticsCountryLabel } from './country-label'

describe('getAnalyticsCountryLabel', () => {
  it('labels ISO countries without losing the code', () => {
    expect(getAnalyticsCountryLabel('US')).toBe('United States · US')
  })

  it('keeps Cloudflare pseudo-country codes usable', () => {
    expect(getAnalyticsCountryLabel('T1')).toBe('T1')
  })

  it('keeps the missing-country bucket usable', () => {
    expect(getAnalyticsCountryLabel('Unknown')).toBe('Unknown')
  })
})
