import { describe, expect, it } from 'vitest'
import {
  canonicalSignaturePayload,
  signTransformRequest,
  verifyTransformSignature,
} from './signing'

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
})
