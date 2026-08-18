import { defineHandler, redirect } from 'nitro/h3'

const DELIVERY_PATH_PREFIXES = ['/api/', '/cdn-cgi/', '/img/', '/og/', '/p/']

export function getCanonicalRedirect(method: string, url: URL) {
  if (
    (method !== 'GET' && method !== 'HEAD') ||
    url.pathname === '/' ||
    !url.pathname.endsWith('/') ||
    DELIVERY_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
  ) {
    return
  }

  return `${url.pathname.slice(0, -1)}${url.search}`
}

export default defineHandler((event) => {
  const target = getCanonicalRedirect(event.req.method, event.url)
  if (target) {
    return redirect(target, 308)
  }
})
