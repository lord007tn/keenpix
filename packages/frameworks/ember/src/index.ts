import {
  buildImageUrl,
  createImageAttributes,
  type KeenpixConfig,
  type KeenpixImageInput,
  type KeenpixTransform,
} from '@keenpix/core'

export * from '@keenpix/core'

export function createKeenpixUrlHelper(config: KeenpixConfig) {
  return (src: string, transform: KeenpixTransform = {}) =>
    buildImageUrl(config, src, transform)
}

export function createKeenpixImageAttributesHelper(config: KeenpixConfig) {
  return (src: string, input: Omit<KeenpixImageInput, 'src'>) =>
    createImageAttributes(config, { ...input, src })
}

export const createEmberImageAttributes = createImageAttributes
