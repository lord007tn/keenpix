import {
  buildImageUrl,
  type KeenpixConfig,
  type KeenpixTransform,
} from '@keenpix/core'

export * from '@keenpix/core'

export function createNuxtImageProvider(config: KeenpixConfig) {
  return {
    getImage(src: string, options: { modifiers?: KeenpixTransform } = {}) {
      return { url: buildImageUrl(config, src, options.modifiers) }
    },
  }
}
