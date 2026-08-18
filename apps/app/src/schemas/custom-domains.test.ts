import { describe, expect, it } from 'vitest'
import { customDomainHostnameSchema } from './custom-domains'

describe('customDomainHostnameSchema', () => {
  it('normalizes a pasted hostname URL', () => {
    expect(
      customDomainHostnameSchema.parse('https://Images.Example.com/path'),
    ).toBe('images.example.com')
  })

  it.each([
    'localhost',
    '*.example.com',
    'example',
  ])('rejects %s', (hostname) => {
    expect(customDomainHostnameSchema.safeParse(hostname).success).toBe(false)
  })
})
