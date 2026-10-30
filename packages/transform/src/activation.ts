// This only suppresses observations. A caller cannot grant customer eligibility
// through a header/query; that is an operator-owned database policy.
const WWW_PREFIX = /^www\./
const TRAILING_DOTS = /\.+$/
// Server-owned: sources Keenpix itself hosts prove nothing about a customer wiring
// up their own images. Every subdomain of these is Keenpix-owned too.
const KEENPIX_OWNED_DOMAINS = ['keenpix.com']

export function isActivationDelivery(request: Request, appOrigin: string) {
  if (
    request.method !== 'GET' ||
    new URL(request.url).searchParams.has('__keenpix_preview') ||
    request.headers.has('x-keenpix-request-purpose') ||
    ['purpose', 'sec-purpose'].some((name) => {
      const value = request.headers.get(name)?.toLowerCase() ?? ''
      return value.includes('prefetch') || value.includes('prerender')
    })
  ) {
    return false
  }
  const referrer = request.headers.get('referer')
  if (referrer) {
    try {
      const host = new URL(referrer).hostname.replace(WWW_PREFIX, '')
      if (host === new URL(appOrigin).hostname.replace(WWW_PREFIX, '')) {
        return false
      }
    } catch {
      return false
    }
  }
  return true
}

// The source-host half of origin_first_external_image_v1. A missing host cannot
// prove the source is external, so it does not qualify.
export function isExternalImageSource(
  sourceHost: string | null | undefined,
  appOrigin: string,
) {
  const host = sourceHost?.toLowerCase().replace(TRAILING_DOTS, '')
  if (!host) {
    return false
  }
  return !(
    KEENPIX_OWNED_DOMAINS.some(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    ) ||
    host.replace(WWW_PREFIX, '') ===
      new URL(appOrigin).hostname
        .toLowerCase()
        .replace(TRAILING_DOTS, '')
        .replace(WWW_PREFIX, '')
  )
}
