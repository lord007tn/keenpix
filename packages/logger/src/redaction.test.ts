import { describe, expect, it } from 'vitest'
import {
  KEENPIX_REDACTION_PATHS,
  KEENPIX_REDACTION_PATTERNS,
} from './redaction'

describe('evlog redaction', () => {
  it.each([
    'Authorization: Bearer abcdefghijklmnop',
    'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature',
    'guest@example.com',
    '+216 20 123 456',
    '415-555-2671',
    'client_secret=browser-oauth-secret',
    'TN59 1000 6035 1835 9847 8831',
    '4111 1111 1111 1111',
    '123-45-6789',
  ])('matches sensitive text: %s', (value) => {
    expect(
      KEENPIX_REDACTION_PATTERNS.some((pattern) => {
        pattern.lastIndex = 0
        return pattern.test(value)
      }),
    ).toBe(true)
  })

  it('redacts sensitive fields at any depth', () => {
    expect(KEENPIX_REDACTION_PATHS).toEqual(
      expect.arrayContaining([
        'authorization',
        'password',
        'apiKey',
        'clientSecret',
        'email',
        'phone',
        'cardNumber',
      ]),
    )
  })
})
