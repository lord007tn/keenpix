// This only suppresses observations. A caller cannot grant customer eligibility
// through a header/query; that is an operator-owned database policy.
const WWW_PREFIX = /^www\./

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
