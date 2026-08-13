import {
  buildImageUrl,
  type KeenpixConfig,
  type KeenpixTransform,
} from '@keenpix/core'

export * from '@keenpix/core'

export interface AnalogImageLoaderInput {
  height?: number
  isPlaceholder?: boolean
  loaderParams?: Omit<KeenpixTransform, 'height' | 'width'>
  src: string
  width?: number
}

export function createAnalogImageLoader(config: KeenpixConfig) {
  return (input: AnalogImageLoaderInput) =>
    buildImageUrl(config, input.src, {
      ...input.loaderParams,
      height: input.height,
      width: input.width,
    })
}

export function createAnalogImageProvider(
  imageLoaderToken: unknown,
  config: KeenpixConfig,
) {
  return {
    provide: imageLoaderToken,
    useValue: createAnalogImageLoader(config),
  }
}
