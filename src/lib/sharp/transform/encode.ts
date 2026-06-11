import type sharp from 'sharp'
import type { TransformOptions } from '@/shared/transform'

export function encodeFormat(pipeline: sharp.Sharp, opts: TransformOptions) {
  switch (opts.format) {
    case 'avif':
      // effort 4 is the default and very slow; 3 roughly halves encode CPU for
      // a negligible size difference and matters on the cache-miss hot path.
      return pipeline.avif({ quality: opts.quality, effort: 3 })
    case 'webp':
      return pipeline.webp({ quality: opts.quality })
    case 'png':
      return pipeline.png()
    default:
      return pipeline.jpeg({ quality: opts.quality, progressive: true })
  }
}
