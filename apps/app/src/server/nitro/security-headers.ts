import type { NitroAppPlugin } from 'nitro/types'

export const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "base-uri 'self'; object-src 'none'; frame-ancestors 'self'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
}

export function setSecurityHeaders(response: Response) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!response.headers.has(name)) {
      response.headers.set(name, value)
    }
  }
  if (response.status >= 400 && !response.headers.has('X-Robots-Tag')) {
    response.headers.set('X-Robots-Tag', 'noindex, follow')
  }
}

const plugin: NitroAppPlugin = (nitroApp) => {
  // Keep the application response baseline aligned with the final Cloudflare
  // response-header policy. Cloudflare also covers framework-generated 404s that
  // do not pass through this Nitro hook.
  nitroApp.hooks.hook('response', (response) => {
    setSecurityHeaders(response)
  })
}

export default plugin
