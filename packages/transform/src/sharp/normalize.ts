import type { TransformStep } from './types'

export const applyNormalize: TransformStep = (pipeline) => pipeline.normalize()
