import type sharp from 'sharp'
import { env } from '@/env/server'
import type { TransformOptions } from '@/shared/transform'

/**
 * Longest output side when a request gives no explicit width or height.
 * Bounds full-resolution re-encodes and never upscales smaller sources.
 */
const MAX_DIMENSION = env.KEENPIX_MAX_DIMENSION

export function applyResize(pipeline: sharp.Sharp, opts: TransformOptions) {
  const dpr = opts.dpr && opts.dpr > 1 ? opts.dpr : 1
  const width = opts.width ? Math.round(opts.width * dpr) : undefined
  const height = opts.height ? Math.round(opts.height * dpr) : undefined
  if (!(width || height)) {
    return pipeline.resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
  }
  return pipeline.resize({
    width,
    height,
    fit: opts.fit,
    withoutEnlargement: true,
  })
}
