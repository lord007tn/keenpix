import type { TransformStep } from './types'

export const applyGrayscale: TransformStep = (pipeline) => pipeline.grayscale()
