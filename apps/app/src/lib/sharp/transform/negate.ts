import type { TransformStep } from './types'

export const applyNegate: TransformStep = (pipeline) => pipeline.negate()
