import {
  buildImageUrl,
  type KeenpixConfig,
  type KeenpixTransform,
} from '@keenpix/core'

export * from '@keenpix/core'

export type ReactNativeImageCache =
  | 'default'
  | 'force-cache'
  | 'only-if-cached'
  | 'reload'

export interface ReactNativeImageSourceOptions {
  cache?: ReactNativeImageCache
  headers?: Record<string, string>
}

export interface KeenpixReactNativeImageInput extends KeenpixTransform {
  alt: string
  cache?: ReactNativeImageCache
  headers?: Record<string, string>
  src: string
}

const RESIZE_MODES = {
  contain: 'contain',
  cover: 'cover',
  fill: 'stretch',
  inside: 'contain',
  outside: 'cover',
} as const

export function createReactNativeImageSource(
  config: KeenpixConfig,
  src: string,
  transform: KeenpixTransform = {},
  options: ReactNativeImageSourceOptions = {},
) {
  return {
    ...(options.cache ? { cache: options.cache } : {}),
    ...(options.headers ? { headers: options.headers } : {}),
    ...(transform.height ? { height: transform.height } : {}),
    ...(transform.width ? { width: transform.width } : {}),
    uri: buildImageUrl(config, src, transform),
  }
}

export function createReactNativeImageSources(
  config: KeenpixConfig,
  src: string,
  widths: number[],
  transform: Omit<KeenpixTransform, 'height' | 'width'> & {
    aspectRatio: number
  },
) {
  const { aspectRatio, ...imageTransform } = transform

  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    throw new RangeError('aspectRatio must be a positive finite number')
  }

  return [...new Set(widths)]
    .filter((width) => Number.isInteger(width) && width > 0)
    .sort((a, b) => a - b)
    .map((width) =>
      createReactNativeImageSource(config, src, {
        ...imageTransform,
        height: Math.round(width / aspectRatio),
        width,
      }),
    )
}

export function createReactNativeImageProps(
  config: KeenpixConfig,
  input: KeenpixReactNativeImageInput,
) {
  const { alt, cache, headers, src, ...transform } = input

  return {
    accessibilityLabel: alt,
    resizeMode: transform.fit ? RESIZE_MODES[transform.fit] : 'cover',
    source: createReactNativeImageSource(config, src, transform, {
      cache,
      headers,
    }),
  }
}
