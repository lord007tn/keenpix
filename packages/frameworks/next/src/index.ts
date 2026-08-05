import {
  createImageAttributes,
  createKeenpixLoader,
  type KeenpixConfig,
  type KeenpixImageInput,
} from '@keenpix/core'

export * from '@keenpix/core'

export function createNextLoader(config: KeenpixConfig) {
  return createKeenpixLoader(config)
}

export function createNextImageProps(
  config: KeenpixConfig,
  input: KeenpixImageInput,
) {
  return createImageAttributes(config, input)
}
