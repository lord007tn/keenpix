import type sharp from 'sharp'
import type { TransformOptions } from '@/shared/transform'

export function encodeFormat(pipeline: sharp.Sharp, opts: TransformOptions) {
  switch (opts.format) {
    case 'avif':
      // effort 4 is the default and very slow; 3 roughly halves encode CPU for
      // a negligible size difference and matters on the cache-miss hot path.
      return pipeline.avif({ quality: opts.quality, effort: 3 })
    case 'gif':
      return pipeline.gif()
    case 'heif':
      return pipeline.heif({ quality: opts.quality, compression: 'av1' })
    case 'png':
      return pipeline.png()
    case 'tiff':
      return pipeline.tiff({ quality: opts.quality })
    case 'webp':
      return pipeline.webp({ quality: opts.quality })
    case 'svg':
      throw new Error('SVG output bypasses Sharp')
    default:
      return pipeline.jpeg({ quality: opts.quality, progressive: true })
  }
}
