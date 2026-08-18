import type sharp from 'sharp'
import type { TransformOptions } from '../types'

export type TransformStep = (
  pipeline: sharp.Sharp,
  opts: TransformOptions,
) => sharp.Sharp
