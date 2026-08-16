import { describe, expect, it } from 'vitest'
import { getBlogLanguage } from './locale'

describe('getBlogLanguage', () => {
  it('matches only the Arabic listing and its descendants', () => {
    expect(getBlogLanguage('/blog/ar')).toBe('ar')
    expect(getBlogLanguage('/blog/ar/signed-images')).toBe('ar')
    expect(getBlogLanguage('/blog/architecture')).toBe('en')
    expect(getBlogLanguage('/blog/arrays')).toBe('en')
  })
})
