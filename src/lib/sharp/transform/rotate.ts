import type { TransformStep } from './types'

export const applyRotate: TransformStep = (pipeline, opts) =>
  opts.rotate
    ? pipeline.rotate(opts.rotate, { background: opts.background })
    : pipeline
