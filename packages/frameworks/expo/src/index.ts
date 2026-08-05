import {
  buildImageUrl,
  type KeenpixConfig,
  type KeenpixTransform,
} from '@keenpix/core'

export * from '@keenpix/core'

export function createExpoImageSource(
  config: KeenpixConfig,
  src: string,
  transform?: KeenpixTransform,
) {
  return { uri: buildImageUrl(config, src, transform) }
}
