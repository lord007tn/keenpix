import { createHmac } from 'node:crypto'
import { canonicalSignaturePayload } from '@keenpix/core'

export { canonicalSignaturePayload } from '@keenpix/core'

export function signTransformRequest(
  secret: string,
  src: string,
  searchParams: URLSearchParams,
) {
  return createHmac('sha256', secret)
    .update(canonicalSignaturePayload(src, searchParams))
    .digest('base64url')
}

export function signTransformUrl(
  url: URL | string,
  secret: string,
  options: {
    expiresAt?: Date | number
    keyVersion?: number
    signatureParams?: Record<string, string>
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
  const signatureSearchParams = new URLSearchParams(signed.searchParams)
  for (const [key, value] of Object.entries(options.signatureParams ?? {})) {
    signatureSearchParams.set(key, value)
  }
  signed.searchParams.set(
    'sig',
    signTransformRequest(secret, src, signatureSearchParams),
  )
  return signed.toString()
}
