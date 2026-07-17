import { resolveCustomDomainProject } from '@/actions/custom-domains'
import { optimizeProjectImage } from '@/actions/transform'
import { env } from '@/env/server'
import {
  getPublicTransformErrorMessage,
  getTransformErrorStatus,
} from '@/errors/transform'
import { getTrustedCustomDomainHostname } from '@/helpers/custom-domains/edge-request'
import { cacheControl } from '@/lib/cache/cache'
import { getContentType } from '@/shared/transform'

const LEADING_SLASHES_RE = /^\/+/

// HTTP boundary for the transform API. Routes handle URL shape here, then the
// action layer owns project lookup, origin safety, transforms, cache, and logs.
export async function handleTransformRequest(
  request: Request,
  pathSource?: string,
) {
  const startedAt = performance.now()
  const searchParams = new URL(request.url).searchParams
  const src = pathSource
    ? decodeSourcePath(pathSource)
    : searchParams.get('url')

  if (!src) {
    return new Response('Missing source image URL', { status: 400 })
  }

  const edgeHostname = getTrustedCustomDomainHostname(
    request,
    env.CLOUDFLARE_SAAS_EDGE_SECRET,
  )
  let projectId = edgeHostname
    ? await resolveCustomDomainProject(edgeHostname)
    : searchParams.get('project')
  if (!projectId) {
    projectId =
      (await resolveCustomDomainProject(new URL(request.url).hostname)) ?? null
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
