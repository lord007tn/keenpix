import { describe, expect, it } from 'vitest'
import { getTrustedCustomDomainHostname } from './edge-request'

const secret = 'a-secure-edge-secret-that-is-long-enough'

describe('trusted custom-domain edge request', () => {
  it('accepts the Worker hostname when the shared secret matches', () => {
    const request = new Request('https://keenpix.com/img/source', {
      headers: {
        'x-keenpix-custom-host': 'Images.Customer.com',
        'x-keenpix-edge-secret': secret,
      },
    })

    expect(getTrustedCustomDomainHostname(request, secret)).toBe(
      'images.customer.com',
    )
  })

  it('rejects spoofed secrets and malformed hostnames', () => {
    const spoofed = new Request('https://keenpix.com/img/source', {
      headers: {
        'x-keenpix-custom-host': 'images.customer.com',
        'x-keenpix-edge-secret': 'not-the-worker-secret',
      },
    })
    const malformed = new Request('https://keenpix.com/img/source', {
      headers: {
        'x-keenpix-custom-host': 'https://images.customer.com/path',
        'x-keenpix-edge-secret': secret,
      },
    })

    expect(getTrustedCustomDomainHostname(spoofed, secret)).toBeUndefined()
    expect(getTrustedCustomDomainHostname(malformed, secret)).toBeUndefined()
  })
})
