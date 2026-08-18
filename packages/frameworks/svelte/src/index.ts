import {
  createImageAttributes,
  type KeenpixConfig,
  type KeenpixImageInput,
} from '@keenpix/core'

export * from '@keenpix/core'

export function createSvelteImageProps(
  config: KeenpixConfig,
  input: KeenpixImageInput,
) {
  const { srcSet, ...attributes } = createImageAttributes(config, input)

  return {
    ...attributes,
    srcset: srcSet,
  }
}

export function createSvelteKeenpix(config: KeenpixConfig) {
  return {
    imageProps: (input: KeenpixImageInput) =>
      createSvelteImageProps(config, input),
  }
}
