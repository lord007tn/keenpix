import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

// The query param carrying the signature on /img requests. NOT `s` — that is
// already the compact `resize` alias in the transform params.
export const SIGNATURE_PARAM = 'sig'

// Canonical message: the raw source URL, a newline, then every query param
// except the signature itself as `key=value`, sorted — so the order params
// appear in the wild never changes the signature. Documented publicly in
// /docs/concepts/signed-urls; treat any change as a breaking API change.
export function canonicalSignaturePayload(
  src: string,
  searchParams: URLSearchParams,
): string {
  const pairs: string[] = []
  for (const [key, value] of searchParams.entries()) {
    if (key !== SIGNATURE_PARAM) {
      pairs.push(`${key}=${value}`)
    }
  }
  pairs.sort()
  return `${src}\n${pairs.join('&')}`
}

export function signTransformRequest(
  secret: string,
  src: string,
  searchParams: URLSearchParams,
): string {
  return createHmac('sha256', secret)
    .update(canonicalSignaturePayload(src, searchParams))
    .digest('base64url')
}

export function verifyTransformSignature(
  secret: string,
  src: string,
  searchParams: URLSearchParams,
): boolean {
  const provided = searchParams.get(SIGNATURE_PARAM)
  if (!provided) {
    return false
  }
  const expected = signTransformRequest(secret, src, searchParams)
  const providedBytes = Buffer.from(provided)
  const expectedBytes = Buffer.from(expected)
  return (
    providedBytes.length === expectedBytes.length &&
    timingSafeEqual(providedBytes, expectedBytes)
  )
}

// A fresh per-project signing secret. base64url keeps it copy-paste safe in
// URLs, env files, and CI secrets.
export function generateSigningSecret(): string {
  return randomBytes(32).toString('base64url')
}
