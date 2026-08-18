import {
  createKeenpixLoader,
  type KeenpixConfig,
  type KeenpixImageInput,
} from '@keenpix/core'
import { createSvelteImageProps } from '@keenpix/svelte'

export * from '@keenpix/core'
export * from '@keenpix/svelte'

export function createSvelteKitKeenpix(config: KeenpixConfig) {
  return {
    imageProps: (input: KeenpixImageInput) =>
      createSvelteImageProps(config, input),
    loader: createKeenpixLoader(config),
  }
}

export { createKeenpixLoader as createSvelteKitImageLoader } from '@keenpix/core'
