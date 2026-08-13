import {
  createImageAttributes,
  createKeenpixLoader,
  type KeenpixConfig,
  type KeenpixImageInput,
} from '@keenpix/core'

export * from '@keenpix/core'

export function createTanStackImageProps(
  config: KeenpixConfig,
  input: KeenpixImageInput,
) {
  return createImageAttributes(config, input)
}

export function createTanStackImage(config: KeenpixConfig) {
  return (input: KeenpixImageInput) => createTanStackImageProps(config, input)
}

export function createTanStackImageLoader(config: KeenpixConfig) {
  return createKeenpixLoader(config)
}
