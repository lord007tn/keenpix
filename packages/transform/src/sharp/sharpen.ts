import type { TransformStep } from './types'

export const applySharpen: TransformStep = (pipeline, opts) =>
  typeof opts.sharpen === 'number'
    ? pipeline.sharpen({ sigma: opts.sharpen })
    : pipeline.sharpen()
