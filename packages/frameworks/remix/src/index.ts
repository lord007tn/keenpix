import {
  createImageAttributes,
  createKeenpixLoader,
  type KeenpixConfig,
  type KeenpixImageInput,
} from '@keenpix/core'

export * from '@keenpix/core'

export function createRemixImageProps(
  config: KeenpixConfig,
  input: KeenpixImageInput,
) {
  return createImageAttributes(config, input)
}

export function createRemixImage(config: KeenpixConfig) {
  return (input: KeenpixImageInput) => createRemixImageProps(config, input)
}

export function createRemixImageLoader(config: KeenpixConfig) {
  return createKeenpixLoader(config)
}
