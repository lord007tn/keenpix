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
