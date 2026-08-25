import { createRequestEventBuffer } from '@keenpix/analytics'
import { createTransformCache } from '@keenpix/cache'
import { createLogger } from '@keenpix/logger'
import {
  assertAllowedOrigin,
  assertSafeOrigin,
  fetchOriginImage,
  getContentType,
  getPublicTransformErrorMessage,
  getTransformErrorStatus,
  type OutputFormat,
  optimizeSvgImage,
  parseTransformParams,
  TransformError,
  type TransformOptions,
  transformImage,
  verifyTransformSignature,
  type WatermarkPosition,
} from '@keenpix/transform'
import {
  getProjectIdByCustomHostname,
  getTransformProject,
  orgCanServe,
} from './data-access'
import {
  EDGE_PROJECT_HEADER,
  getTrustedEdgeRequest,
  validateEdgePartition,
} from './edge-request'
import { env } from './env'

const logger = createLogger()
const analytics = createRequestEventBuffer({ logger })
const inflight = new Map<string, Promise<{ bytesIn: number; out: Buffer }>>()
const LEADING_SLASHES_RE = /^\/+/

const s3 =
  env.KEENPIX_CACHE_S3_ACCESS_KEY_ID &&
  env.KEENPIX_CACHE_S3_BUCKET &&
  env.KEENPIX_CACHE_S3_ENDPOINT &&
  env.KEENPIX_CACHE_S3_SECRET_ACCESS_KEY
    ? {
        accessKeyId: env.KEENPIX_CACHE_S3_ACCESS_KEY_ID,
        bucket: env.KEENPIX_CACHE_S3_BUCKET,
        endpoint: env.KEENPIX_CACHE_S3_ENDPOINT,
        region: env.KEENPIX_CACHE_S3_REGION,
        secretAccessKey: env.KEENPIX_CACHE_S3_SECRET_ACCESS_KEY,
      }
    : undefined

export const transformCache = createTransformCache({
  cacheControl: env.KEENPIX_CACHE_CONTROL,
  deleteAfterMs: env.KEENPIX_CACHE_DELETE_AFTER_MS,
  dir: env.KEENPIX_CACHE_DIR,
  dragonflyMaxBytes: env.KEENPIX_CACHE_DRAGONFLY_MAX_BYTES,
  maxBytes: env.KEENPIX_CACHE_MAX_BYTES,
  memoryMaxBytes: env.KEENPIX_MEMORY_CACHE_MAX_BYTES,
  redisUrl: env.KEENPIX_CACHE_REDIS_URL,
  s3,
  staleMs: env.KEENPIX_CACHE_STALE_MS,
})

function sourcePath(src: string) {
  try {
    return new URL(src).pathname
  } catch {
    return src.slice(0, 200)
  }
}

function sourceHost(src: string) {
  try {
    return new URL(src).hostname
  } catch {
    return
  }
}

function createTransform(input: {
  allowedOrigins: string[]
  cacheKey: string
  format: OutputFormat
  src: string
  transformOptions: TransformOptions
}) {
  const work = (async () => {
    const origin = await assertSafeOrigin(input.src, input.allowedOrigins)
    const [originBytes, watermarkBytes] = await Promise.all([
      fetchOriginImage(origin, input.allowedOrigins, {
        maxBytes: env.KEENPIX_MAX_ORIGIN_BYTES,
        timeoutMs: env.KEENPIX_ORIGIN_TIMEOUT_MS,
      }),
      input.transformOptions.watermark && input.format !== 'svg'
        ? assertSafeOrigin(
            input.transformOptions.watermark.url,
            input.allowedOrigins,
          ).then((watermarkOrigin) =>
            fetchOriginImage(watermarkOrigin, input.allowedOrigins, {
              maxBytes: env.KEENPIX_MAX_WATERMARK_BYTES,
              timeoutMs: env.KEENPIX_ORIGIN_TIMEOUT_MS,
            }),
          )
        : undefined,
    ])
    let out: Buffer
    try {
      out =
        input.format === 'svg'
          ? optimizeSvgImage(originBytes)
          : (
              await transformImage(originBytes, input.transformOptions, {
                maxDimension: env.KEENPIX_MAX_DIMENSION,
                maxInputPixels: env.KEENPIX_MAX_INPUT_PIXELS,
                watermarkBytes,
              })
            ).data
    } catch (error) {
      if (error instanceof TransformError) {
        throw error
      }
      throw new TransformError('Origin is not a valid image', 502)
    }
    await transformCache
      .write(input.cacheKey, input.format, out, originBytes.byteLength)
      .catch((error) => logger.warn({ error }, 'cache write failed'))
    return { bytesIn: originBytes.byteLength, out }
  })()
  inflight.set(input.cacheKey, work)
  work.finally(() => inflight.delete(input.cacheKey)).catch(() => undefined)
  return work
}

async function readOrCreateTransform(
  input: Parameters<typeof createTransform>[0],
) {
  const cached = await transformCache.read(input.cacheKey, input.format)
  if (cached) {
    if (cached.stale && !inflight.has(input.cacheKey)) {
      createTransform(input).catch((error) =>
        logger.warn(
          { error, path: sourcePath(input.src) },
          'stale image refresh failed',
        ),
      )
    }
    return {
      bytesIn: 0,
      cached: true,
      originalBytes: cached.originalBytes,
      out: cached.data,
    }
  }
  const existing = inflight.get(input.cacheKey)
  if (existing) {
    const result = await existing
    return {
      ...result,
      bytesIn: 0,
      cached: false,
      originalBytes: result.bytesIn,
    }
  }
  const result = await createTransform(input)
  return { ...result, cached: false, originalBytes: result.bytesIn }
}

export async function optimizeProjectImage(input: {
  accept: string
  clientHints?: {
    dpr?: string | null
    viewportWidth?: string | null
    width?: string | null
  }
  country?: string
  projectId: string
  recordLog?: boolean
  searchParams: URLSearchParams
  src: string
  startedAt?: number
  trusted?: boolean
}) {
  const startedAt = input.startedAt ?? performance.now()
  const project = await getTransformProject(input.projectId)
  if (!project) {
    throw new TransformError('Unknown project', 404)
  }
  if (!(await orgCanServe(project.orgId, env.KEENPIX_MODE === 'cloud'))) {
    throw new TransformError(
      'This project is not entitled to serve images',
      402,
    )
  }
  if (
    project.requireSignedUrls &&
    !input.trusted &&
    !(
      project.signingSecret &&
      verifyTransformSignature(
        project.signingSecret,
        input.src,
        input.searchParams,
        {
          keyVersion: project.signingKeyVersion,
          maxTtlSeconds: project.signedUrlTtlSeconds,
          requireExpiration: Boolean(project.signedUrlTtlSeconds),
        },
      )
    )
  ) {
    throw new TransformError('Missing or invalid URL signature', 403)
  }

  const options = parseTransformParams(
    input.searchParams,
    input.accept,
    {
      autoFormat: project.autoFormat,
      defaultDpr: project.defaultDpr,
      defaultFit: project.defaultFit as TransformOptions['fit'],
      defaultQuality: project.defaultQuality,
      maxWidth: project.maxWidth,
    },
    input.clientHints,
  )
  let status = 200
  let cached = false
  let bytesIn = 0
  let bytesOut = 0
  let originalBytes = 0
  try {
    assertAllowedOrigin(input.src, project.allowedOrigins)
    const transformOptions = {
      ...options,
      stripMetadata: project.stripMetadata,
      watermark:
        project.watermarkEnabled && project.watermarkUrl
          ? {
              margin: project.watermarkMargin,
              opacity: project.watermarkOpacity,
              position: project.watermarkPosition as WatermarkPosition,
              scale: project.watermarkScale,
              url: project.watermarkUrl,
            }
          : undefined,
    }
    const result = await readOrCreateTransform({
      allowedOrigins: project.allowedOrigins,
      cacheKey: transformCache.buildKey({
        projectId: project.id,
        transformOptions,
        url: input.src,
      }),
      format: options.format,
      src: input.src,
      transformOptions,
    })
    cached = result.cached
    bytesIn = result.bytesIn
    bytesOut = result.out.byteLength
    originalBytes = result.originalBytes
    return {
      body: result.out,
      cached,
      contentDpr:
        input.searchParams.get('dpr') === 'auto' ? options.dpr : undefined,
      format: options.format,
    }
  } catch (error) {
    status = getTransformErrorStatus(error)
    if (status >= 500) {
      logger.error(
        { error, path: sourcePath(input.src) },
        'image transform failed',
      )
    }
    throw error
  } finally {
    if (input.recordLog !== false) {
      analytics.enqueue({
        bytesIn,
        bytesOut,
        bytesSaved: Math.max(0, originalBytes - bytesOut),
        cached,
        country: input.country ?? '',
        format: options.format,
        latencyMs: Math.round(performance.now() - startedAt),
        orgId: project.orgId,
        path: sourcePath(input.src),
        projectId: project.id,
        quality: options.quality,
        sourceHost: sourceHost(input.src),
        status,
        width: options.width,
      })
    }
  }
}

export async function handleTransformRequest(
  request: Request,
  pathSource?: string,
) {
  const startedAt = performance.now()
  const url = new URL(request.url)
  const searchParams = url.searchParams
  const src = pathSource
    ? decodeSourcePath(pathSource)
    : searchParams.get('url')
  if (!src) {
    return new Response('Missing source image URL', { status: 400 })
  }
  const edge = getTrustedEdgeRequest(request, env.CLOUDFLARE_SAAS_EDGE_SECRET)
  if (!validateEdgePartition(searchParams, edge?.hostname)) {
    return new Response('Invalid delivery-edge request', { status: 400 })
  }
  let projectId = edge?.projectId ?? searchParams.get('project') ?? undefined
  if (!projectId && edge?.hostname) {
    projectId = await getProjectIdByCustomHostname(edge.hostname)
  }
  if (!projectId && env.KEENPIX_MODE !== 'cloud') {
    projectId = await getProjectIdByCustomHostname(url.hostname)
  }
  if (!projectId) {
    return new Response('Missing ?project or verified custom domain', {
      status: 400,
    })
  }
  try {
    const result = await optimizeProjectImage({
      accept: request.headers.get('accept') ?? '',
      clientHints: {
        dpr: request.headers.get('sec-ch-dpr') ?? request.headers.get('dpr'),
        viewportWidth:
          request.headers.get('sec-ch-viewport-width') ??
          request.headers.get('viewport-width'),
        width:
          request.headers.get('sec-ch-width') ?? request.headers.get('width'),
      },
      country: (
        request.headers.get('cf-ipcountry') ??
        request.headers.get('x-vercel-ip-country') ??
        ''
      ).toUpperCase(),
      projectId,
      searchParams,
      src,
      startedAt,
    })
    const isSvg = result.format === 'svg'
    return new Response(
      request.method === 'HEAD' ? null : new Uint8Array(result.body),
      {
        headers: {
          'cache-control': transformCache.cacheControl,
          'accept-ch': 'Sec-CH-DPR, Sec-CH-Width, Sec-CH-Viewport-Width',
          'content-length': String(result.body.byteLength),
          'content-type': getContentType(result.format),
          vary: 'Accept, Sec-CH-DPR, Sec-CH-Width, Sec-CH-Viewport-Width, DPR, Width, Viewport-Width',
          ...(result.contentDpr
            ? { 'content-dpr': String(result.contentDpr) }
            : {}),
          'x-content-type-options': 'nosniff',
          'x-keenpix-cache': result.cached ? 'HIT' : 'MISS',
          ...(edge ? { [EDGE_PROJECT_HEADER]: projectId } : {}),
          ...(isSvg
            ? {
                'content-security-policy':
                  "default-src 'none'; style-src 'unsafe-inline'; sandbox",
              }
            : {}),
        },
      },
    )
  } catch (error) {
    return new Response(getPublicTransformErrorMessage(error), {
      headers: edge ? { [EDGE_PROJECT_HEADER]: projectId } : undefined,
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

export const flushTransformAnalytics = analytics.flush
