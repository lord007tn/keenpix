import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { canonicalSignaturePayload } from '@keenpix/core'

// The query param carrying the signature on /img requests. NOT `s` — that is
// already the compact `resize` alias in the transform params.
const SIGNATURE_PARAM = 'sig'
const UNIX_SECONDS_RE = /^\d+$/

export interface TransformSignaturePolicy {
  clockSkewSeconds?: number
  keyVersion?: number
  maxTtlSeconds?: number | null
  now?: number
  requireExpiration?: boolean
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
  policy: TransformSignaturePolicy = {},
): boolean {
  const provided = searchParams.get(SIGNATURE_PARAM)
  if (!provided) {
    return false
  }
  const keyVersion = searchParams.get('kid')
  if (
    policy.keyVersion !== undefined &&
    keyVersion !== String(policy.keyVersion)
  ) {
    return false
  }
  const expiration = searchParams.get('exp')
  if (policy.requireExpiration && !expiration) {
    return false
  }
  if (expiration) {
    if (!UNIX_SECONDS_RE.test(expiration)) {
      return false
    }
    const expiresAt = Number.parseInt(expiration, 10)
    if (!Number.isSafeInteger(expiresAt) || expiresAt < 0) {
      return false
    }
    const now = Math.floor((policy.now ?? Date.now()) / 1000)
    const clockSkew = Math.max(0, policy.clockSkewSeconds ?? 30)
    if (expiresAt + clockSkew < now) {
      return false
    }
    if (policy.maxTtlSeconds) {
      const issuedAtValue = searchParams.get('iat') ?? ''
      if (!UNIX_SECONDS_RE.test(issuedAtValue)) {
        return false
      }
      const issuedAt = Number.parseInt(issuedAtValue, 10)
      if (
        !Number.isSafeInteger(issuedAt) ||
        issuedAt > now + clockSkew ||
        expiresAt - issuedAt > policy.maxTtlSeconds + clockSkew
      ) {
        return false
      }
    }
  }
  const expected = signTransformRequest(secret, src, searchParams)
  const providedBytes = Buffer.from(provided)
  const expectedBytes = Buffer.from(expected)
  return (
    providedBytes.length === expectedBytes.length &&
    timingSafeEqual(providedBytes, expectedBytes)
  )
}

export function signTransformUrl(
  url: URL | string,
  secret: string,
  options: {
    expiresAt?: Date | number
    keyVersion?: number
    src?: string
  } = {},
) {
  const signed = new URL(url)
  const src = options.src ?? signed.searchParams.get('url')
  if (!src) {
    throw new Error('Provide src when signing a path-based transform URL')
  }
  if (options.expiresAt !== undefined) {
    const expiresAt =
      options.expiresAt instanceof Date
        ? options.expiresAt.getTime()
        : options.expiresAt
    signed.searchParams.set('iat', String(Math.floor(Date.now() / 1000)))
    signed.searchParams.set('exp', String(Math.floor(expiresAt / 1000)))
  }
  if (options.keyVersion !== undefined) {
    signed.searchParams.set('kid', String(options.keyVersion))
  }
  signed.searchParams.set(
    SIGNATURE_PARAM,
    signTransformRequest(secret, src, signed.searchParams),
  )
  return signed.toString()
}

// A fresh per-project signing secret. base64url keeps it copy-paste safe in
// URLs, env files, and CI secrets.
export function generateSigningSecret(): string {
  return randomBytes(32).toString('base64url')
}
