import { resolveCustomDomainProject } from '@/actions/custom-domains'
import { optimizeProjectImage } from '@/actions/transform'
import { env } from '@/env/server'
import {
  getPublicTransformErrorMessage,
  getTransformErrorStatus,
} from '@/errors/transform'
import {
  EDGE_PROJECT_HEADER,
  getTrustedEdgeRequest,
  validateCustomDomainCachePartition,
} from '@/helpers/custom-domains/edge-request'
import { cacheControl } from '@/lib/cache/cache'
import { getAppUrl, isCloud } from '@/server/deployment'
import { getContentType } from '@/shared/transform'

const LEADING_SLASHES_RE = /^\/+/
const CLOUD_DELIVERY_ORIGIN = 'https://cdn.keenpix.com'

// HTTP boundary for the transform API. Routes handle URL shape here, then the
// action layer owns project lookup, origin safety, transforms, cache, and logs.
export async function handleTransformRequest(
  request: Request,
  pathSource?: string,
) {
  const startedAt = performance.now()
  const requestUrl = new URL(request.url)
  const searchParams = requestUrl.searchParams
  const src = pathSource
    ? decodeSourcePath(pathSource)
    : searchParams.get('url')

  if (!src) {
    return new Response('Missing source image URL', { status: 400 })
  }

  const edgeRequest = getTrustedEdgeRequest(
    request,
    env.CLOUDFLARE_SAAS_EDGE_SECRET,
  )
  const edgeHostname = edgeRequest?.hostname
  if (!validateCustomDomainCachePartition(searchParams, edgeHostname)) {
    return new Response(
      edgeHostname
        ? 'Invalid custom-domain edge request'
        : 'Reserved query parameter',
      { status: 400 },
    )
  }
  let projectId = edgeRequest?.projectId
  if (edgeRequest) {
    projectId ??=
      (await resolveCustomDomainProject(edgeRequest.hostname)) ?? undefined
    if (!edgeRequest.projectId) {
      const requestedProjectId = searchParams.get('project')
      if (projectId && requestedProjectId && requestedProjectId !== projectId) {
        return new Response('Project does not match verified custom domain', {
          status: 400,
          headers: { [EDGE_PROJECT_HEADER]: projectId },
        })
      }
      searchParams.delete('project')
    }
  } else if (isCloud()) {
    const requestHostname = requestUrl.hostname.toLowerCase()
    const appHostname = new URL(getAppUrl()).hostname.toLowerCase()
    const firstPartyHostnames = new Set([
      appHostname,
      appHostname.startsWith('www.')
        ? appHostname.slice('www.'.length)
        : `www.${appHostname}`,
    ])
    if (firstPartyHostnames.has(requestHostname)) {
      projectId = searchParams.get('project') ?? undefined
      if (!projectId) {
        return new Response('Missing ?project or verified custom domain', {
          status: 400,
        })
      }

      // Cloud traffic has one canonical, project-attributed edge URL. Keep the
      // old app-origin route as a permanent redirect only; the trusted Worker
      // request bypasses this branch and still executes the transform here.
      // Removing `project` is safe for signed legacy URLs because the Worker
      // restores the same project value before origin verification.
      const redirectUrl = new URL(CLOUD_DELIVERY_ORIGIN)
      redirectUrl.pathname = `/p/${encodeURIComponent(projectId)}${requestUrl.pathname}`
      redirectUrl.search = requestUrl.search
      redirectUrl.searchParams.delete('project')
      return new Response(null, {
        status: 308,
        headers: {
          'cache-control': 'public, max-age=86400',
          location: redirectUrl.toString(),
        },
      })
    }

    projectId = (await resolveCustomDomainProject(requestHostname)) ?? undefined
    const requestedProjectId = searchParams.get('project')
    if (projectId && requestedProjectId && requestedProjectId !== projectId) {
      return new Response('Project does not match verified custom domain', {
        status: 400,
      })
    }
    // Custom domains identify their project by hostname. Do not let a legacy
    // query value affect cache keys, signatures, transforms, or attribution.
    searchParams.delete('project')
  } else {
    projectId =
      searchParams.get('project') ??
      (await resolveCustomDomainProject(requestUrl.hostname)) ??
      undefined
  }
  if (!projectId) {
    return new Response('Missing ?project or verified custom domain', {
      status: 400,
    })
  }

  // The edge tells us the requester's country (Cloudflare/Vercel set these);
  // absent in local/dev, where it just falls back to "" (Unknown).
  const country = (
    request.headers.get('cf-ipcountry') ??
    request.headers.get('x-vercel-ip-country') ??
    ''
  ).toUpperCase()

  try {
    const result = await optimizeProjectImage({
      accept: request.headers.get('accept') ?? '',
      country,
      projectId,
      searchParams,
      src,
      startedAt,
    })

    // SVG can carry script; even after SVGO optimization it is served with a
    // locked-down CSP + nosniff so a malicious source SVG can't execute in the
    // serving origin's context (stored-XSS / account-takeover guard).
    const isSvg = result.format === 'svg'
    return new Response(new Uint8Array(result.body), {
      status: 200,
      headers: {
        'content-type': getContentType(result.format),
        'content-length': String(result.body.byteLength),
        'cache-control': cacheControl(),
        vary: 'Accept',
        'x-content-type-options': 'nosniff',
        // Origin-shield cache status, for observability behind an outer CDN.
        'x-keenpix-cache': result.cached ? 'HIT' : 'MISS',
        // The trusted edge Worker consumes and strips this marker. Keeping it
        // on the cached origin response lets later Cloudflare hits retain the
        // same project attribution without a KV lookup or public API key.
        ...(edgeRequest ? { [EDGE_PROJECT_HEADER]: projectId } : {}),
        ...(isSvg
          ? {
              'content-security-policy':
                "default-src 'none'; style-src 'unsafe-inline'; sandbox",
            }
          : {}),
      },
    })
  } catch (error) {
    return new Response(getPublicTransformErrorMessage(error), {
      status: getTransformErrorStatus(error),
      headers: edgeRequest ? { [EDGE_PROJECT_HEADER]: projectId } : undefined,
    })
  }
}

function decodeSourcePath(pathSource: string) {
  const trimmed = pathSource.replace(LEADING_SLASHES_RE, '')
  try {
    return decodeURIComponent(trimmed)
  } catch {
    return trimmed
  }
}
