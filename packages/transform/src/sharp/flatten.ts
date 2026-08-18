import type { TransformStep } from './types'

export const applyFlatten: TransformStep = (pipeline, opts) =>
  opts.flatten
    ? pipeline.flatten({ background: opts.background ?? '#000000' })
    : pipeline
