import {
  buildImageUrl,
  type KeenpixConfig,
  type KeenpixTransform,
} from '@keenpix/core'

export * from '@keenpix/core'

export interface ExpoImageSourceOptions {
  cacheKey?: string
  headers?: Record<string, string>
  webMaxViewportWidth?: number
}

export interface KeenpixExpoImageInput extends KeenpixTransform {
  alt: string
  cacheKey?: string
  cachePolicy?: 'disk' | 'memory' | 'memory-disk' | 'none'
  headers?: Record<string, string>
  src: string
}

const CONTENT_FITS = {
  contain: 'contain',
  cover: 'cover',
  fill: 'fill',
  inside: 'scale-down',
  outside: 'cover',
} as const

export function createExpoImageSource(
  config: KeenpixConfig,
  src: string,
  transform: KeenpixTransform = {},
  options: ExpoImageSourceOptions = {},
) {
  return {
    ...(transform.animated === undefined
      ? {}
      : { isAnimated: transform.animated }),
    ...(options.cacheKey ? { cacheKey: options.cacheKey } : {}),
    ...(options.headers ? { headers: options.headers } : {}),
    ...(transform.height ? { height: transform.height } : {}),
    ...(options.webMaxViewportWidth
      ? { webMaxViewportWidth: options.webMaxViewportWidth }
      : {}),
    ...(transform.width ? { width: transform.width } : {}),
    uri: buildImageUrl(config, src, transform),
  }
}

export function createExpoImageSources(
  config: KeenpixConfig,
  src: string,
  widths: number[],
  transform: Omit<KeenpixTransform, 'height' | 'width'> & {
    aspectRatio?: number
  } = {},
) {
  const { aspectRatio, ...imageTransform } = transform
  if (
    aspectRatio !== undefined &&
    !(Number.isFinite(aspectRatio) && aspectRatio > 0)
  ) {
    throw new RangeError('aspectRatio must be a positive finite number')
  }

  return [...new Set(widths)]
    .filter((width) => Number.isInteger(width) && width > 0)
    .sort((a, b) => a - b)
    .map((width) =>
      createExpoImageSource(
        config,
        src,
        {
          ...imageTransform,
          height: aspectRatio ? Math.round(width / aspectRatio) : undefined,
          width,
        },
        { webMaxViewportWidth: width },
      ),
    )
}

export function createExpoImageProps(
  config: KeenpixConfig,
  input: KeenpixExpoImageInput,
) {
  const {
    alt,
    cacheKey,
    cachePolicy = 'disk',
    headers,
    src,
    ...transform
  } = input

  return {
    alt,
    cachePolicy,
    contentFit: transform.fit ? CONTENT_FITS[transform.fit] : 'cover',
    source: createExpoImageSource(config, src, transform, {
      cacheKey,
      headers,
    }),
  }
}
