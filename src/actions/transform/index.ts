import { getProjectById } from '@/data-access/projects'
import { createRequestLog } from '@/data-access/request-logs'
import { getTransformErrorStatus, TransformError } from '@/errors/transform'
import { parseTransformParams } from '@/helpers/transform/params'
import { orgEntitledForServing } from '@/lib/billing/service-gate'
import { buildCacheKey, readCacheEntry, writeCache } from '@/lib/cache/cache'
import { errorContext, logger } from '@/lib/logger/logger'
import { fetchOriginImage } from '@/lib/origin/fetch-image'
import { assertAllowedOrigin, assertSafeOrigin } from '@/lib/origin/safe-origin'
import { runQueuedJob } from '@/lib/queue/transform-queue'
import { transformImage } from '@/lib/sharp/transform'
import { optimizeSvgImage } from '@/lib/svg/optimize'
import { verifyTransformSignature } from '@/lib/transform-signing/signing'
import type { OutputFormat, TransformOptions } from '@/shared/transform'

export interface OptimizeProjectImageInput {
  accept: string
  country?: string
  projectId: string
  recordLog?: boolean
  searchParams: URLSearchParams
  src: string
  startedAt?: number
  // True for authenticated internal callers (SDK prewarm) that never carry a
  // URL signature; the public /img route always leaves this false.
  trusted?: boolean
}

export interface PrewarmProjectImagesInput {
  dpr?: number
  fit?: TransformOptions['fit']
  formats: Array<OutputFormat | 'auto'>
  projectId: string
  quality?: number
  sources: string[]
  widths: number[]
}

interface CachedTransformInput {
  allowedOrigins: string[]
  cacheKey: string
  format: OutputFormat
  src: string
  transformOptions: TransformOptions
}

const inflightTransforms = new Map<string, Promise<Buffer>>()

function logPath(src: string) {
  try {
    return new URL(src).pathname
  } catch {
    return src.slice(0, 200)
  }
}

function logHost(src: string) {
  try {
    return new URL(src).hostname
  } catch {
    return
  }
}

async function readOrCreateTransform({
  allowedOrigins,
  cacheKey,
  format,
  src,
  transformOptions,
}: CachedTransformInput) {
  const cached = await readCacheEntry(cacheKey, format)
  if (cached) {
    if (cached.stale && !inflightTransforms.has(cacheKey)) {
      startTransformRefresh({
        allowedOrigins,
        cacheKey,
        format,
        src,
        transformOptions,
      }).catch((error) => {
        logger.warn(
          { ...errorContext(error), path: logPath(src) },
          'Stale image refresh failed',
        )
      })
    }
    // A hit still booked a saving: it served an optimized variant in place of
    // the (larger) origin original, whose size we persisted with the entry.
    return {
      out: cached.data,
      cached: true,
      bytesIn: 0,
      originalBytes: cached.originalBytes,
    }
  }

  const existing = inflightTransforms.get(cacheKey)
  if (existing) {
    return { out: await existing, cached: false, bytesIn: 0, originalBytes: 0 }
  }

  const work = startTransformRefresh({
    allowedOrigins,
    cacheKey,
    format,
    src,
    transformOptions,
  })
  try {
    const result = await work
    return {
      out: result.out,
      cached: false,
      bytesIn: result.bytesIn,
      originalBytes: result.bytesIn,
    }
  } finally {
    inflightTransforms.delete(cacheKey)
  }
}

function startTransformRefresh(input: CachedTransformInput) {
  const work = runQueuedJob(async () => {
    const { allowedOrigins, cacheKey, format, src, transformOptions } = input
    const origin = await assertSafeOrigin(src, allowedOrigins)
    const originBytes = await fetchOriginImage(origin, allowedOrigins)
    const bytesIn = originBytes.byteLength

    let output: Buffer
    try {
      output =
        format === 'svg'
          ? optimizeSvgImage(originBytes)
          : (await transformImage(originBytes, transformOptions)).data
    } catch (error) {
      if (error instanceof TransformError) {
        throw error
      }
      throw new TransformError('Origin is not a valid image', 502)
    }

    await writeCache(cacheKey, format, output, bytesIn).catch((error) => {
      logger.warn(errorContext(error), 'Cache write failed')
    })

    return { bytesIn, out: output }
  })

  inflightTransforms.set(
    input.cacheKey,
    work.then((result) => result.out),
  )
  work.then(
    () => inflightTransforms.delete(input.cacheKey),
    () => inflightTransforms.delete(input.cacheKey),
  )
  return work
}

// Use case for the transform pipeline: resolve project settings, validate the
// origin, run fetch + sharp + cache, then record request analytics.
export async function optimizeProjectImage({
  accept,
  country = '',
  projectId,
  recordLog = true,
  searchParams,
  src,
  startedAt = performance.now(),
  trusted = false,
}: OptimizeProjectImageInput) {
  // Public data plane: a transform request carries only a project id and is
  // gated by the project's own allowlist, not a session org — so the lookup is
  // org-agnostic (a project's images must serve regardless of the caller's org).
  const project = await getProjectById(projectId)
  if (!project) {
    throw new TransformError('Unknown project', 404)
  }
  // Cloud only: an org with no active subscription can't serve traffic (no free
  // tier). TTL-cached so the hot path stays fast; a no-op in self-host.
  if (!(await orgEntitledForServing(project.orgId))) {
    throw new TransformError(
      'This project is not on an active plan. Ask the workspace owner to subscribe.',
      402,
    )
  }
  // Opt-in URL signing on top of the allowlist: blocks third parties from
  // burning a project's metered bandwidth with cache-busting query strings.
  // Trusted internal callers (SDK prewarm) are already authenticated.
  if (project.requireSignedUrls && !trusted) {
    const secret = project.signingSecret
    if (!(secret && verifyTransformSignature(secret, src, searchParams))) {
      throw new TransformError('Missing or invalid URL signature', 403)
    }
  }

  const transformOptions = parseTransformParams(searchParams, accept, {
    autoFormat: project.autoFormat,
    defaultQuality: project.defaultQuality,
    defaultDpr: project.defaultDpr,
    defaultFit: project.defaultFit,
    maxWidth: project.maxWidth,
  })
  const { width, quality, format } = transformOptions

  let status = 200
  let cached = false
  let bytesIn = 0
  let bytesOut = 0
  let originalBytes = 0

  try {
    assertAllowedOrigin(src, project.allowedOrigins)
    const cacheKey = buildCacheKey({
      projectId: project.id,
      url: src,
      transformOptions: {
        ...transformOptions,
        stripMetadata: project.stripMetadata,
      },
    })

    const result = await readOrCreateTransform({
      allowedOrigins: project.allowedOrigins,
      cacheKey,
      format,
      src,
      transformOptions: {
        ...transformOptions,
        stripMetadata: project.stripMetadata,
      },
    })

    cached = result.cached
    bytesIn = result.bytesIn
    bytesOut = result.out.byteLength
    originalBytes = result.originalBytes

    return {
      body: result.out,
      format,
      cached,
    }
  } catch (error) {
    status = getTransformErrorStatus(error)
    if (status >= 500) {
      logger.error(
        { ...errorContext(error), path: logPath(src) },
        'Image transform failed',
      )
    }
    throw error
  } finally {
    if (recordLog) {
      createRequestLog({
        orgId: project.orgId,
        projectId: project.id,
        path: logPath(src),
        sourceHost: logHost(src),
        country,
        width,
        quality,
        format,
        status,
        cached,
        latencyMs: Math.round(performance.now() - startedAt),
        bytesIn,
        bytesOut,
        // Compression delta booked on every delivery (hit or miss): the origin
        // original — persisted with the cache entry, so a hit knows it without
        // refetching — minus the optimized bytes served.
        bytesSaved: Math.max(0, originalBytes - bytesOut),
      }).catch(() => {
        // Request logging is telemetry, not part of the transform response path.
      })
    }
  }
}

export function prewarmProjectImages({
  dpr,
  fit,
  formats,
  projectId,
  quality,
  sources,
  widths,
}: PrewarmProjectImagesInput) {
  const jobs = sources.flatMap((src) =>
    widths.flatMap((width) =>
      formats.map((format) => {
        const searchParams = new URLSearchParams({
          fmt: format,
          project: projectId,
          w: String(width),
        })
        if (quality) {
          searchParams.set('q', String(quality))
        }
        if (fit) {
          searchParams.set('fit', fit)
        }
        if (dpr) {
          searchParams.set('dpr', String(dpr))
        }
        return optimizeProjectImage({
          accept: format === 'auto' ? 'image/avif,image/webp,image/*' : '',
          projectId,
          recordLog: false,
          searchParams,
          src,
          // Prewarm arrives via the authenticated SDK API, not the public
          // route, so it doesn't carry (or need) a URL signature.
          trusted: true,
        })
      }),
    ),
  )

  Promise.allSettled(jobs).then((results) => {
    const failed = results.filter((result) => result.status === 'rejected')
    if (failed.length > 0) {
      logger.warn(
        { failed: failed.length, total: results.length },
        'Image prewarm completed with failures',
      )
    }
  })

  return { variantCount: jobs.length }
}
