import { getProject } from '@/data-access/projects'
import { createRequestLog } from '@/data-access/request-logs'
import { getTransformErrorStatus, TransformError } from '@/errors/transform'
import { buildCacheKey, readCache, writeCache } from '@/lib/cdn/cache'
import { runQueuedJob } from '@/lib/concurrency'
import { errorContext, logger } from '@/lib/logger'
import {
  type OutputFormat,
  type TransformOptions,
  transformImage,
} from '@/lib/sharp/transform'
import { fetchOriginImage } from '@/lib/transform/origin-fetch'
import { parseTransformParams } from '@/lib/transform/params'
import { assertSafeOrigin } from '@/lib/transform/safe-origin'

export interface OptimizeProjectImageInput {
  accept: string
  projectId: string
  searchParams: URLSearchParams
  src: string
  startedAt?: number
}

export interface OptimizedProjectImage {
  body: Buffer
  format: OutputFormat
}

type ValidatedOrigin = Awaited<ReturnType<typeof assertSafeOrigin>>

interface CachedTransformInput {
  allowedOrigins: string[]
  cacheKey: string
  format: OutputFormat
  origin: ValidatedOrigin
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

async function readOrCreateTransform({
  allowedOrigins,
  cacheKey,
  format,
  origin,
  transformOptions,
}: CachedTransformInput) {
  const cachedOut = await readCache(cacheKey, format)
  if (cachedOut) {
    return { out: cachedOut, cached: true, bytesIn: 0 }
  }

  const existing = inflightTransforms.get(cacheKey)
  if (existing) {
    return { out: await existing, cached: false, bytesIn: 0 }
  }

  let producedBytesIn = 0
  const work = runQueuedJob(async () => {
    const input = await fetchOriginImage(origin, allowedOrigins)
    producedBytesIn = input.byteLength

    let result: Awaited<ReturnType<typeof transformImage>>
    try {
      result = await transformImage(input, transformOptions)
    } catch (error) {
      if (error instanceof TransformError) {
        throw error
      }
      throw new TransformError('Origin is not a valid image', 502)
    }

    await writeCache(cacheKey, format, result.data).catch((error) => {
      logger.warn(errorContext(error), 'Cache write failed')
    })

    return result.data
  })

  inflightTransforms.set(cacheKey, work)
  try {
    return { out: await work, cached: false, bytesIn: producedBytesIn }
  } finally {
    inflightTransforms.delete(cacheKey)
  }
}

// Use case for the transform pipeline: resolve project settings, validate the
// origin, run fetch + sharp + cache, then record request analytics.
export async function optimizeProjectImage({
  accept,
  projectId,
  searchParams,
  src,
  startedAt = Date.now(),
}: OptimizeProjectImageInput): Promise<OptimizedProjectImage> {
  const project = await getProject(projectId)
  if (!project) {
    throw new TransformError('Unknown project', 404)
  }

  const { width, height, quality, dpr, blur, fit, format } =
    parseTransformParams(searchParams, accept, {
      autoFormat: project.autoFormat,
      defaultQuality: project.defaultQuality,
    })

  let status = 200
  let cached = false
  let bytesIn = 0
  let bytesOut = 0

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

    return {
      body: result.out,
      format,
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
    createRequestLog({
      orgId: project.orgId,
      projectId: project.id,
      path: logPath(src),
      width,
      quality,
      format,
      status,
      cached,
      latencyMs: Date.now() - startedAt,
      bytesIn,
      bytesOut,
    }).catch(() => {
      // Request logging is telemetry, not part of the transform response path.
    })
  }
}
