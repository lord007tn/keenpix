import type sharp from 'sharp'
import type { TransformOptions } from '@/shared/transform'

export function applyBlur(pipeline: sharp.Sharp, opts: TransformOptions) {
  return pipeline.blur(Math.min(1000, Math.max(0.3, opts.blur ?? 0.3)))
}
