import type { TransformStep } from './types'

export const applyMedian: TransformStep = (pipeline, opts) =>
  opts.median ? pipeline.median(opts.median) : pipeline
