import type { TransformStep } from './types'

export const applyGamma: TransformStep = (pipeline, opts) =>
  opts.gamma ? pipeline.gamma(opts.gamma.gamma, opts.gamma.gammaOut) : pipeline
