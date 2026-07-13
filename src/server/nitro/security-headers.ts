import type { NitroAppPlugin } from 'nitro/types'

export const SECURITY_HEADERS = {
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
}

const plugin: NitroAppPlugin = (nitroApp) => {
  // Route rules do not cover TanStack's app-generated not-found response in the
  // current Nitro adapter. Apply the same baseline at the final response hook so
  // redirects, errors, and 404s cannot bypass it.
  nitroApp.hooks.hook('response', (response) => {
    setSecurityHeaders(response)
  })
}

export default plugin
