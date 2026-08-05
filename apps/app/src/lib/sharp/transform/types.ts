import type sharp from 'sharp'
import type { TransformOptions } from '@/shared/transform'

export type TransformStep = (
  pipeline: sharp.Sharp,
  opts: TransformOptions,
) => sharp.Sharp
