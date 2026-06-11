import type { TransformStep } from './types'

export const applyTint: TransformStep = (pipeline, opts) =>
  opts.tint ? pipeline.tint(opts.tint) : pipeline
