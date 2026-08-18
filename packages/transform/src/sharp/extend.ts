import type { TransformStep } from './types'

export const applyExtend: TransformStep = (pipeline, opts) =>
  opts.extend
    ? pipeline.extend({
        ...opts.extend,
        background: opts.background,
      })
    : pipeline
