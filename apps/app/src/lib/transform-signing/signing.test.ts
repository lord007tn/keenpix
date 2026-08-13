import { canonicalSignaturePayload } from '@keenpix/core'
import {
  signTransformRequest,
  signTransformUrl,
  verifyTransformSignature,
} from '@keenpix/transform'
import { describe, expect, it, vi } from 'vitest'

const SECRET = 'test-secret'
const SRC = 'https://cdn.example.com/photo.jpg'

function params(query: string): URLSearchParams {
  return new URLSearchParams(query)
}

describe('transform URL signing', () => {
  it('is order-independent over query params', () => {
    const a = params('project=p1&w=800&fmt=webp')
    const b = params('fmt=webp&project=p1&w=800')
    expect(canonicalSignaturePayload(SRC, a)).toBe(
      canonicalSignaturePayload(SRC, b),
    )
    expect(signTransformRequest(SECRET, SRC, a)).toBe(
      signTransformRequest(SECRET, SRC, b),
    )
  })

  it('excludes the signature param itself from the payload', () => {
    const unsigned = params('project=p1&w=800')
    const signature = signTransformRequest(SECRET, SRC, unsigned)
    const signed = params(`project=p1&w=800&sig=${signature}`)
    expect(verifyTransformSignature(SECRET, SRC, signed)).toBe(true)
  })

  it('rejects a missing signature', () => {
    expect(verifyTransformSignature(SECRET, SRC, params('project=p1'))).toBe(
      false,
    )
  })

  it('rejects a tampered param', () => {
    const unsigned = params('project=p1&w=800')
    const signature = signTransformRequest(SECRET, SRC, unsigned)
    const tampered = params(`project=p1&w=4000&sig=${signature}`)
    expect(verifyTransformSignature(SECRET, SRC, tampered)).toBe(false)
  })

  it('rejects a tampered source URL', () => {
    const unsigned = params('project=p1&w=800')
    const signature = signTransformRequest(SECRET, SRC, unsigned)
    const signed = params(`project=p1&w=800&sig=${signature}`)
    expect(
      verifyTransformSignature(
        SECRET,
        'https://cdn.example.com/other.jpg',
        signed,
      ),
    ).toBe(false)
  })

  it('rejects a signature made with a different secret', () => {
    const unsigned = params('project=p1&w=800')
    const signature = signTransformRequest('other-secret', SRC, unsigned)
    const signed = params(`project=p1&w=800&sig=${signature}`)
    expect(verifyTransformSignature(SECRET, SRC, signed)).toBe(false)
  })

  it('rejects cache-busting via an added junk param', () => {
    const unsigned = params('project=p1&w=800')
    const signature = signTransformRequest(SECRET, SRC, unsigned)
    const busted = params(`project=p1&w=800&cb=123&sig=${signature}`)
    expect(verifyTransformSignature(SECRET, SRC, busted)).toBe(false)
  })

  it('enforces expiration, TTL, and key version policy', () => {
    const now = Date.UTC(2026, 7, 13, 12, 0, 0)
    const issuedAt = Math.floor(now / 1000)
    const unsigned = params(
      `project=p1&w=800&kid=3&iat=${issuedAt}&exp=${issuedAt + 300}`,
    )
    unsigned.set('sig', signTransformRequest(SECRET, SRC, unsigned))

    expect(
      verifyTransformSignature(SECRET, SRC, unsigned, {
        keyVersion: 3,
        maxTtlSeconds: 600,
        now,
        requireExpiration: true,
      }),
    ).toBe(true)
    expect(
      verifyTransformSignature(SECRET, SRC, unsigned, {
        keyVersion: 4,
        maxTtlSeconds: 600,
        now,
        requireExpiration: true,
      }),
    ).toBe(false)
    expect(
      verifyTransformSignature(SECRET, SRC, unsigned, {
        keyVersion: 3,
        maxTtlSeconds: 60,
        now,
        requireExpiration: true,
      }),
    ).toBe(false)
  })

  it('builds an expiring versioned signed query URL', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-13T12:00:00Z'))
    const expiresAt = Date.UTC(2026, 7, 13, 12, 5, 0)
    const signed = new URL(
      signTransformUrl(
        `https://keenpix.example/img?url=${encodeURIComponent(SRC)}&w=800`,
        SECRET,
        { expiresAt, keyVersion: 2 },
      ),
    )
    expect(signed.searchParams.get('exp')).toBe(String(expiresAt / 1000))
    expect(signed.searchParams.get('iat')).toBe(
      String(Date.UTC(2026, 7, 13, 12, 0, 0) / 1000),
    )
    expect(signed.searchParams.get('kid')).toBe('2')
    expect(verifyTransformSignature(SECRET, SRC, signed.searchParams)).toBe(
      true,
    )
    vi.useRealTimers()
  })
})
