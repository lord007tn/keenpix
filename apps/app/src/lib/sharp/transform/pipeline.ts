import sharp from 'sharp'
import { env } from '@/env/server'

/**
 * Decode-time pixel ceiling on the input image. Guards against decompression
 * bombs: tiny compressed files that expand to huge raw bitmaps.
 */
const MAX_INPUT_PIXELS = env.KEENPIX_MAX_INPUT_PIXELS

import type { TransformOptions } from '@/shared/transform'

export function createPipeline(input: Buffer, opts: TransformOptions) {
  return sharp(input, {
    animated: opts.animated,
    failOn: 'truncated',
    limitInputPixels: MAX_INPUT_PIXELS,
  }).rotate()
}
