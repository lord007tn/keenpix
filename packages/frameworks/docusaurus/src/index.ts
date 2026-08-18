import {
  createImageAttributes,
  type KeenpixConfig,
  type KeenpixImageInput,
} from '@keenpix/core'

export * from '@keenpix/core'

export function createDocusaurusImageProps(
  config: KeenpixConfig,
  input: KeenpixImageInput,
) {
  return createImageAttributes(config, input)
}

export function createDocusaurusImage(config: KeenpixConfig) {
  return (input: KeenpixImageInput) => createDocusaurusImageProps(config, input)
}
