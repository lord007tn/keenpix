import sharp from 'sharp'
import { env } from '@/env/server'

/**
 * Decode-time pixel ceiling on the input image. Guards against decompression
 * bombs: tiny compressed files that expand to huge raw bitmaps.
 */
const MAX_INPUT_PIXELS = env.KEENPIX_MAX_INPUT_PIXELS

export function createPipeline(input: Buffer) {
  return sharp(input, {
    failOn: 'truncated',
    limitInputPixels: MAX_INPUT_PIXELS,
  }).rotate()
}
