import { describe, expect, it } from 'vitest'
import { SECURITY_HEADERS, setSecurityHeaders } from './security-headers'

describe('Nitro security headers', () => {
  it('adds the baseline to an error response', () => {
    const response = new Response('Not found', { status: 404 })

    setSecurityHeaders(response)

    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(response.headers.get(name)).toBe(value)
    }
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, follow')
  })

  it('preserves a stricter route-specific header', () => {
    const response = new Response(null, {
      headers: { 'X-Frame-Options': 'DENY' },
    })

    setSecurityHeaders(response)

    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
    expect(response.headers.has('X-Robots-Tag')).toBe(false)
  })
})
