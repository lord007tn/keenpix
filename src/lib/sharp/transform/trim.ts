import type { TransformStep } from './types'

export const applyTrim: TransformStep = (pipeline, opts) => {
  if (!opts.trim) {
    return pipeline
  }
  if (opts.trim === true) {
    return opts.background
      ? pipeline.trim({ background: opts.background })
      : pipeline.trim()
  }
  return opts.background
    ? pipeline.trim({ threshold: opts.trim, background: opts.background })
    : pipeline.trim({ threshold: opts.trim })
}
