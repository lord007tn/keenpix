const FORWARDED_PAIR_RE = /\s*([^=;\s]+)=("[^"]+"|[^;\s]+)\s*/g
const INVALID_FORWARDED_HOST_RE = /[\s/?#\\]/
const OUTER_QUOTES_RE = /^"|"$/g
const TRAILING_COLON_RE = /:$/

export function getClientIp(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    undefined
  )
}

export function getPublicBaseUrl(request: Request) {
  const requestUrl = new URL(request.url)
  const forwarded = Object.fromEntries(
    [
      ...(request.headers
        .get('forwarded')
        ?.split(',')[0]
        ?.matchAll(FORWARDED_PAIR_RE) ?? []),
    ].map((match) => [
      match[1]?.toLowerCase() ?? '',
      match[2]?.trim().replace(OUTER_QUOTES_RE, '') ?? '',
    ]),
  )
  const proto = (
    request.headers.get('x-forwarded-proto')?.split(',')[0] ??
    forwarded.proto ??
    requestUrl.protocol
  )
    .trim()
    .toLowerCase()
    .replace(OUTER_QUOTES_RE, '')
    .replace(TRAILING_COLON_RE, '')
  const host = (
    request.headers.get('x-forwarded-host')?.split(',')[0] ??
    forwarded.host ??
    requestUrl.host
  )
    .trim()
    .replace(OUTER_QUOTES_RE, '')

  if (
    (proto !== 'http' && proto !== 'https') ||
    !host ||
    INVALID_FORWARDED_HOST_RE.test(host)
  ) {
    return requestUrl.origin
  }

  try {
    return new URL(`${proto}://${host}`).origin
  } catch {
    return requestUrl.origin
  }
}
