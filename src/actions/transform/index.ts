import { getProject } from '@/data-access/projects'
import { insertRequestLog } from '@/data-access/request-logs'
import { getTransformErrorStatus, TransformError } from '@/errors/transform'
import { buildCacheKey } from '@/lib/cdn/cache'
import type { OutputFormat } from '@/lib/sharp/transform'
import { readOrCreateTransform } from '@/lib/transform/cache-transform'
import { logPath, logServerError } from '@/lib/transform/logging'
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

/**
 * Use case for the transform pipeline. It resolves the project, validates the
 * origin, runs fetch+sharp+cache helpers, and records request analytics.
 */
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
      logServerError(src, error)
    }
    throw error
  } finally {
    insertRequestLog({
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
