import type { TransformStep } from './types'

export const applyThreshold: TransformStep = (pipeline, opts) =>
  opts.threshold === undefined ? pipeline : pipeline.threshold(opts.threshold)
