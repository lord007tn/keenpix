import { getProject } from '@/data-access/projects'
import { insertRequestLog } from '@/data-access/request-logs'
import { buildCacheKey, cacheControl } from '@/lib/cdn/cache'
import { contentTypeFor } from '@/lib/sharp/transform'
import { readOrCreateTransform } from './cache-transform'
import { logPath, logServerError } from './logging'
import { parseTransformParams } from './params'
import { assertSafeOrigin, TransformError } from './ssrf'

/**
 * GET /api/keenpix?url=&w=&h=&q=&fmt=&fit=&dpr=&blur=&project=
 * Fetches an origin image, transforms it with sharp, caches to disk, logs the request.
 */
export async function handleTransform(request: Request) {
  const start = Date.now()
  const sp = new URL(request.url).searchParams
  const src = sp.get('url')

  if (!src) {
    return new Response('Missing ?url', { status: 400 })
  }

  const projectId = sp.get('project')
  if (!projectId) {
    return new Response('Missing ?project', { status: 400 })
  }
  const project = await getProject(projectId)
  if (!project) {
    return new Response('Unknown project', { status: 404 })
  }
  // No API keys: access is gated entirely by the project's origin allowlist
  // (enforced in assertSafeOrigin, which fails closed on an empty list) plus the
  // private-IP/SSRF block.

  const { width, height, quality, dpr, blur, fit, format } =
    parseTransformParams(sp, request.headers.get('accept') ?? '', {
      autoFormat: project.autoFormat,
      defaultQuality: project.defaultQuality,
    })

  let status = 200
  let cached = false
  let bytesIn = 0
  let bytesOut = 0
  let response: Response

  try {
    const origin = await assertSafeOrigin(src, project.allowedOrigins)
    const cacheKey = buildCacheKey({
      projectId: project.id,
      url: src,
      w: width,
      h: height,
      q: quality,
      fmt: format,
      fit,
      dpr,
      blur,
    })

    const result = await readOrCreateTransform({
      allowedOrigins: project.allowedOrigins,
      cacheKey,
      format,
      origin,
      transformOptions: {
        width,
        height,
        dpr,
        quality,
        format,
        fit,
        blur,
        stripMetadata: project.stripMetadata,
      },
    })

    cached = result.cached
    bytesIn = result.bytesIn
    bytesOut = result.out.byteLength
    response = new Response(new Uint8Array(result.out), {
      status: 200,
      headers: {
        'content-type': contentTypeFor(format),
        'cache-control': cacheControl(),
        // Auto-negotiated format varies on Accept — keep CDNs correct.
        vary: 'Accept',
      },
    })
  } catch (e) {
    status = e instanceof TransformError ? e.status : 500
    if (status >= 500) {
      logServerError(src, e)
    }
    // Only our own TransformError messages are safe to echo back; any other
    // error is an unexpected internal failure — return a generic message so we
    // don't leak sharp/undici/stack internals to the caller.
    response = new Response(
      e instanceof TransformError ? e.message : 'Image transform failed',
      { status },
    )
  }

  // Fire-and-forget logging (don't block the response).
  insertRequestLog({
    orgId: project.orgId,
    projectId: project.id,
    path: logPath(src),
    width,
    quality,
    format,
    status,
    cached,
    latencyMs: Date.now() - start,
    bytesIn,
    bytesOut,
  }).catch(() => {
    // ignore log failures
  })

  return response
}
