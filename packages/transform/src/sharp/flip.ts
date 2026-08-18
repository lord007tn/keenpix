import type { TransformStep } from './types'

export const applyFlip: TransformStep = (pipeline, opts) => {
  let next = pipeline
  if (opts.flip) {
    next = next.flip()
  }
  if (opts.flop) {
    next = next.flop()
  }
  return next
}
