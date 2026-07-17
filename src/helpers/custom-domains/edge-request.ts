import { timingSafeEqual } from 'node:crypto'

const HOSTNAME_RE =
  /^(?=.{4,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/
const EDGE_CACHE_HOST_PARAM = '__keenpix_edge_host'

export function getTrustedCustomDomainHostname(
  request: Request,
  expectedSecret?: string,
) {
  const providedSecret = request.headers.get('x-keenpix-edge-secret') ?? ''
  const hostname = (
    request.headers.get('x-keenpix-custom-host') ?? ''
  ).toLowerCase()
  if (!(expectedSecret && providedSecret && HOSTNAME_RE.test(hostname))) {
    return
  }
  const expected = Buffer.from(expectedSecret)
  const provided = Buffer.from(providedSecret)
  if (
    expected.byteLength !== provided.byteLength ||
    !timingSafeEqual(expected, provided)
  ) {
    return
  }
  return hostname
}

export function validateCustomDomainCachePartition(
  searchParams: URLSearchParams,
  hostname?: string,
) {
  const cacheHostname = searchParams.get(EDGE_CACHE_HOST_PARAM)
  if (!hostname) {
    return cacheHostname === null
  }
  if (cacheHostname !== hostname) {
    return false
  }
  searchParams.delete(EDGE_CACHE_HOST_PARAM)
  return true
}
