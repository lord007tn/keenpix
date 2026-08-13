import {
  createKeenpixLoader,
  type KeenpixConfig,
  type KeenpixImageInput,
} from '@keenpix/core'
import { createSolidImageProps } from '@keenpix/solid'

export * from '@keenpix/core'
export * from '@keenpix/solid'

export function createSolidStartKeenpix(config: KeenpixConfig) {
  return {
    imageProps: (input: KeenpixImageInput) =>
      createSolidImageProps(config, input),
    loader: createKeenpixLoader(config),
  }
}

export { createKeenpixLoader as createSolidStartImageLoader } from '@keenpix/core'
