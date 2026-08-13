import {
  createImageAttributes,
  type KeenpixConfig,
  type KeenpixImageInput,
} from '@keenpix/core'

export * from '@keenpix/core'

export function createRedwoodImageProps(
  config: KeenpixConfig,
  input: KeenpixImageInput,
) {
  return createImageAttributes(config, input)
}

export function createRedwoodImage(config: KeenpixConfig) {
  return (input: KeenpixImageInput) => createRedwoodImageProps(config, input)
}
