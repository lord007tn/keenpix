import type sharp from 'sharp'
import type { TransformOptions } from '../types'

/**
 * Longest output side when a request gives no explicit width or height.
 * Bounds full-resolution re-encodes and never upscales smaller sources.
 */
export function applyResize(
  pipeline: sharp.Sharp,
  opts: TransformOptions,
  maxDimension: number,
) {
  // TODO(smart-crop-research): design a Keenpix subject/focal-point model and
  // deterministic fallback contract before replacing libvips attention/entropy.
  const dpr = opts.dpr && opts.dpr > 1 ? opts.dpr : 1
  const width = opts.width ? Math.round(opts.width * dpr) : undefined
  const height = opts.height ? Math.round(opts.height * dpr) : undefined
  const withoutEnlargement = opts.enlarge !== true
  if (!(width || height)) {
    return pipeline.resize({
      width: maxDimension,
      height: maxDimension,
      fit: 'inside',
      withoutEnlargement,
    })
  }
  return pipeline.resize({
    width,
    height,
    background: opts.background,
    fit: opts.fit,
    kernel: opts.kernel,
    position: opts.position,
    withoutEnlargement,
  })
}
