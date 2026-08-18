import {
  buildImageUrl,
  createImageAttributes,
  type KeenpixConfig,
  type KeenpixFormat,
  type KeenpixImageInput,
  type KeenpixTransform,
} from '@keenpix/core'

export * from '@keenpix/core'

export interface AstroImageServiceOptions
  extends Omit<KeenpixTransform, 'format' | 'quality'> {
  alt?: string
  decoding?: 'async' | 'auto' | 'sync'
  format?: KeenpixFormat | 'jpg'
  loading?: 'eager' | 'lazy'
  quality?: number | string
  src: string | { src: string }
}

export function createAstroImageAttributes(
  config: KeenpixConfig,
  input: KeenpixImageInput,
) {
  const { srcSet, ...attributes } = createImageAttributes(config, input)

  return {
    ...attributes,
    srcset: srcSet,
  }
}

export function createAstroImageService(config: KeenpixConfig) {
  return {
    getURL(options: AstroImageServiceOptions) {
      const {
        alt: _alt,
        decoding: _decoding,
        format,
        loading: _loading,
        quality,
        src: source,
        ...transform
      } = options
      const src = typeof source === 'string' ? source : source.src
      const resolvedQuality = typeof quality === 'number' ? quality : undefined

      return buildImageUrl(config, src, {
        ...transform,
        format: format === 'jpg' ? 'jpeg' : format,
        quality: resolvedQuality,
      })
    },
    getHTMLAttributes(options: AstroImageServiceOptions) {
      const {
        animated: _animated,
        background: _background,
        blur: _blur,
        dpr: _dpr,
        enlarge: _enlarge,
        fit: _fit,
        flatten: _flatten,
        flip: _flip,
        flop: _flop,
        format: _format,
        grayscale: _grayscale,
        position: _position,
        quality: _quality,
        rotate: _rotate,
        sharpen: _sharpen,
        src: _src,
        ...attributes
      } = options

      return {
        ...attributes,
        decoding: attributes.decoding ?? ('async' as const),
        loading: attributes.loading ?? ('lazy' as const),
      }
    },
  }
}
