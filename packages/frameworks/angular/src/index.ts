import {
  buildImageUrl,
  type KeenpixConfig,
  type KeenpixFormat,
} from '@keenpix/core'

export * from '@keenpix/core'

export function createAngularImageLoader(config: KeenpixConfig) {
  return (input: {
    loaderParams?: { format?: KeenpixFormat; quality?: number }
    src: string
    width?: number
  }) =>
    buildImageUrl(config, input.src, {
      format: input.loaderParams?.format,
      quality: input.loaderParams?.quality,
      width: input.width,
    })
}
