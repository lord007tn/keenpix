import {
  buildImageUrl,
  createKeenpixLoader,
  type KeenpixConfig,
  type KeenpixFormat,
  type KeenpixTransform,
} from '@keenpix/core'

export * from '@keenpix/core'

export type GatsbyImageLayout = 'constrained' | 'fixed' | 'fullWidth'

export interface KeenpixGatsbyImageInput
  extends Omit<KeenpixTransform, 'format' | 'height' | 'width'> {
  formats?: Exclude<KeenpixFormat, 'auto'>[]
  height: number
  layout?: GatsbyImageLayout
  sizes?: string
  src: string
  width: number
  widths?: number[]
}

export interface GatsbyUrlBuilderInput {
  baseUrl: string
  format?: 'auto' | 'avif' | 'jpg' | 'png' | 'webp'
  height?: number
  options?: Omit<KeenpixTransform, 'format' | 'height' | 'width'>
  width: number
}

const CONTENT_TYPES = {
  avif: 'image/avif',
  gif: 'image/gif',
  heif: 'image/heif',
  jpeg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  tiff: 'image/tiff',
  webp: 'image/webp',
} as const

function buildGatsbySrcSet(
  config: KeenpixConfig,
  src: string,
  widths: number[],
  displayWidth: number,
  displayHeight: number,
  transform: Omit<KeenpixTransform, 'height' | 'width'>,
) {
  return widths
    .map((candidateWidth) => {
      const candidateHeight = Math.round(
        (candidateWidth * displayHeight) / displayWidth,
      )
      return `${buildImageUrl(config, src, {
        ...transform,
        height: candidateHeight,
        width: candidateWidth,
      })} ${candidateWidth}w`
    })
    .join(', ')
}

export function createGatsbyUrlBuilder(
  config: KeenpixConfig,
  defaults: Omit<KeenpixTransform, 'format' | 'height' | 'width'> = {},
) {
  return ({ baseUrl, format, height, options, width }: GatsbyUrlBuilderInput) =>
    buildImageUrl(config, baseUrl, {
      ...defaults,
      ...options,
      format: format === 'jpg' ? 'jpeg' : format,
      height,
      width,
    })
}

export function createGatsbyImageLoader(config: KeenpixConfig) {
  return createKeenpixLoader(config)
}

export function createGatsbyImageData(
  config: KeenpixConfig,
  input: KeenpixGatsbyImageInput,
) {
  const {
    formats = ['webp'],
    height,
    layout = 'constrained',
    sizes: requestedSizes,
    src,
    width,
    widths = layout === 'fixed'
      ? [width, width * 2]
      : [Math.round(width / 4), Math.round(width / 2), width, width * 2],
    ...transform
  } = input
  if (!(Number.isFinite(width) && width > 0)) {
    throw new RangeError('width must be a positive finite number')
  }
  if (!(Number.isFinite(height) && height > 0)) {
    throw new RangeError('height must be a positive finite number')
  }
  let sizes = requestedSizes
  if (!sizes) {
    if (layout === 'fixed') {
      sizes = `${width}px`
    } else if (layout === 'fullWidth') {
      sizes = '100vw'
    } else {
      sizes = `(min-width: ${width}px) ${width}px, 100vw`
    }
  }
  const validWidths = [...new Set(widths)]
    .filter((candidate) => Number.isInteger(candidate) && candidate > 0)
    .sort((a, b) => a - b)
  const fallback = {
    sizes,
    src: buildImageUrl(config, src, { ...transform, height, width }),
    srcSet: buildGatsbySrcSet(
      config,
      src,
      validWidths,
      width,
      height,
      transform,
    ),
  }

  return {
    height,
    images: {
      fallback,
      sources: formats.map((format) => ({
        sizes,
        srcSet: buildGatsbySrcSet(config, src, validWidths, width, height, {
          ...transform,
          format,
        }),
        type: CONTENT_TYPES[format],
      })),
    },
    layout,
    width,
  }
}
