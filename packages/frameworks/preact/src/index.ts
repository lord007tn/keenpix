import {
  createImageAttributes,
  type KeenpixConfig,
  type KeenpixImageInput,
} from '@keenpix/core'

export * from '@keenpix/core'

export function createPreactImageProps(
  config: KeenpixConfig,
  input: KeenpixImageInput,
) {
  return createImageAttributes(config, input)
}

export function createPreactImage(config: KeenpixConfig) {
  return (input: KeenpixImageInput) => createPreactImageProps(config, input)
}
