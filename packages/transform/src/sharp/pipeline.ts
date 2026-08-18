import sharp from 'sharp'
import type { TransformOptions } from '../types'

/**
 * Decode-time pixel ceiling on the input image. Guards against decompression
 * bombs: tiny compressed files that expand to huge raw bitmaps.
 */
export function createPipeline(
  input: Buffer,
  opts: TransformOptions,
  maxInputPixels: number,
) {
  return sharp(input, {
    animated: opts.animated,
    failOn: 'truncated',
    limitInputPixels: maxInputPixels,
  }).rotate()
}
