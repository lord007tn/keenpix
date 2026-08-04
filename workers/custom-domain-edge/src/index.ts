interface Env {
  APP_ORIGIN: string
  EDGE_ANALYTICS: {
    writeDataPoint(point: {
      blobs: string[]
      doubles: number[]
      indexes: string[]
    }): void
  }
  EDGE_SECRET: string
  FIRST_PARTY_HOSTNAME: string
}

const EDGE_HOST_HEADER = 'x-keenpix-custom-host'
const EDGE_SECRET_HEADER = 'x-keenpix-edge-secret'
const EDGE_PROJECT_HEADER = 'x-keenpix-edge-project'
const CACHE_HOST_PARAM = '__keenpix_edge_host'
const FORWARDED_HEADERS = ['accept', 'accept-encoding', 'cf-ipcountry']
const EDGE_OFFLOAD_STATUSES = new Set(['hit', 'ignored', 'stale', 'updating'])
const PROJECT_ID_RE = /^[a-z0-9][a-z0-9_-]{7,127}$/
const FIRST_PARTY_PATH_RE = /^\/p\/([a-z0-9][a-z0-9_-]{7,127})(\/img\/.*)$/

export function getFirstPartyDelivery(url: URL, hostname: string) {
  if (url.hostname.toLowerCase() !== hostname.trim().toLowerCase()) {
    return
  }
  const match = FIRST_PARTY_PATH_RE.exec(url.pathname)
  if (!match) {
    return
  }
  return { projectId: match[1], originPathname: match[2] }
}

export function classifyDelivery(
  status: number,
  cloudflareCacheStatus: string,
  keenpixCacheStatus: string,
) {
  if (status < 200 || status >= 300) {
    return 'failed'
  }
  if (EDGE_OFFLOAD_STATUSES.has(cloudflareCacheStatus)) {
    return 'edge'
  }
  return keenpixCacheStatus === 'hit' ? 'cache' : 'optimized'
}

export function createOriginRequest(request: Request, env: Env) {
  const incoming = new URL(request.url)
  const hostname = incoming.hostname.toLowerCase()
  const firstPartyDelivery = getFirstPartyDelivery(
    incoming,
    env.FIRST_PARTY_HOSTNAME,
  )
  const target = new URL(
    `${firstPartyDelivery?.originPathname ?? incoming.pathname}${incoming.search}`,
    env.APP_ORIGIN,
  )
  target.searchParams.set(CACHE_HOST_PARAM, hostname)
  if (firstPartyDelivery) {
    target.searchParams.set('project', firstPartyDelivery.projectId)
  }
  const headers = new Headers()
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name)
    if (value) {
      headers.set(name, value)
    }
  }
  headers.set(EDGE_HOST_HEADER, hostname)
  headers.set(EDGE_SECRET_HEADER, env.EDGE_SECRET)
  const projectId = firstPartyDelivery?.projectId
  if (projectId) {
    headers.set(EDGE_PROJECT_HEADER, projectId)
  }
  headers.set('x-forwarded-host', hostname)
  return new Request(target, {
    method: request.method,
    headers,
    redirect: 'manual',
  })
}

export default {
  async fetch(request: Request, env: Env) {
    if (!(env.EDGE_SECRET && env.APP_ORIGIN)) {
      return new Response('Edge configuration is incomplete.', { status: 503 })
    }
    if (!(request.method === 'GET' || request.method === 'HEAD')) {
      return new Response('Method not allowed', {
        status: 405,
        headers: { allow: 'GET, HEAD' },
      })
    }
    const incoming = new URL(request.url)
    const firstPartyDelivery = getFirstPartyDelivery(
      incoming,
      env.FIRST_PARTY_HOSTNAME,
    )
    if (!(firstPartyDelivery || incoming.pathname.startsWith('/img/'))) {
      return new Response('Not found', { status: 404 })
    }
    const hostname = incoming.hostname.toLowerCase()
    const hintedProjectId = firstPartyDelivery?.projectId
    const response = await fetch(createOriginRequest(request, env))
    const projectId =
      hintedProjectId ?? response.headers.get(EDGE_PROJECT_HEADER) ?? undefined
    const cloudflareCacheStatus = (
      response.headers.get('cf-cache-status') ?? 'none'
    ).toLowerCase()
    const keenpixCacheStatus = (
      response.headers.get('x-keenpix-cache') ?? 'miss'
    ).toLowerCase()
    if (projectId && PROJECT_ID_RE.test(projectId)) {
      const contentLength = Number(response.headers.get('content-length') ?? 0)
      env.EDGE_ANALYTICS.writeDataPoint({
        indexes: [projectId],
        blobs: [
          classifyDelivery(
            response.status,
            cloudflareCacheStatus,
            keenpixCacheStatus,
          ),
          cloudflareCacheStatus,
          hostname,
          String(response.status),
          (request.headers.get('cf-ipcountry') ?? '').toUpperCase(),
        ],
        doubles: [
          request.method === 'HEAD' || !Number.isFinite(contentLength)
            ? 0
            : Math.max(0, contentLength),
          1,
        ],
      })
    }
    const headers = new Headers(response.headers)
    headers.delete(EDGE_PROJECT_HEADER)
    return new Response(response.body, {
      headers,
      status: response.status,
      statusText: response.statusText,
    })
  },
}
