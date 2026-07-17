interface Env {
  APP_ORIGIN: string
  EDGE_SECRET: string
}

const EDGE_HOST_HEADER = 'x-keenpix-custom-host'
const EDGE_SECRET_HEADER = 'x-keenpix-edge-secret'
const CACHE_HOST_PARAM = '__keenpix_edge_host'
const FORWARDED_HEADERS = ['accept', 'accept-encoding', 'cf-ipcountry']

export function createOriginRequest(request: Request, env: Env) {
  const incoming = new URL(request.url)
  const hostname = incoming.hostname.toLowerCase()
  const target = new URL(
    `${incoming.pathname}${incoming.search}`,
    env.APP_ORIGIN,
  )
  target.searchParams.set(CACHE_HOST_PARAM, hostname)
  const headers = new Headers()
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name)
    if (value) {
      headers.set(name, value)
    }
  }
  headers.set(EDGE_HOST_HEADER, hostname)
  headers.set(EDGE_SECRET_HEADER, env.EDGE_SECRET)
  headers.set('x-forwarded-host', hostname)
  return new Request(target, {
    method: request.method,
    headers,
    redirect: 'manual',
  })
}

export default {
  fetch(request: Request, env: Env) {
    if (!(env.EDGE_SECRET && env.APP_ORIGIN)) {
      return new Response('Edge configuration is incomplete.', { status: 503 })
    }
    if (!(request.method === 'GET' || request.method === 'HEAD')) {
      return new Response('Method not allowed', {
        status: 405,
        headers: { allow: 'GET, HEAD' },
      })
    }
    if (!new URL(request.url).pathname.startsWith('/img/')) {
      return new Response('Not found', { status: 404 })
    }
    return fetch(createOriginRequest(request, env))
  },
}
