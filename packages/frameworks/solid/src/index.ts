import {
  createImageAttributes,
  type KeenpixConfig,
  type KeenpixImageInput,
} from '@keenpix/core'

export * from '@keenpix/core'

export function createSolidImageProps(
  config: KeenpixConfig,
  input: KeenpixImageInput,
) {
  return createImageAttributes(config, input)
}

export function createSolidKeenpix(config: KeenpixConfig) {
  return {
    imageProps: (input: KeenpixImageInput) =>
      createSolidImageProps(config, input),
  }
}
