import type { TransformStep } from './types'

export const applyExtract: TransformStep = (pipeline, opts) =>
  opts.extract ? pipeline.extract(opts.extract) : pipeline
