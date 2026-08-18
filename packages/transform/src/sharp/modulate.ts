import type { TransformStep } from './types'

export const applyModulate: TransformStep = (pipeline, opts) =>
  opts.modulate ? pipeline.modulate(opts.modulate) : pipeline
