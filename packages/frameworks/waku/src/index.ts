import {
  createImageAttributes,
  type KeenpixConfig,
  type KeenpixImageInput,
} from '@keenpix/core'

export * from '@keenpix/core'

export function createWakuImageProps(
  config: KeenpixConfig,
  input: KeenpixImageInput,
) {
  return createImageAttributes(config, input)
}

export function createWakuImage(config: KeenpixConfig) {
  return (input: KeenpixImageInput) => createWakuImageProps(config, input)
}
