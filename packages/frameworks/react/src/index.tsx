import {
  createImageAttributes,
  type KeenpixConfig,
  type KeenpixImageInput,
} from '@keenpix/core'
import type { ImgHTMLAttributes } from 'react'

export * from '@keenpix/core'

export interface KeenpixImageProps
  extends KeenpixImageInput,
    Omit<
      ImgHTMLAttributes<HTMLImageElement>,
      'alt' | 'height' | 'sizes' | 'src' | 'srcSet' | 'width'
    > {
  config: KeenpixConfig
}

export function KeenpixImage({ config, ...input }: KeenpixImageProps) {
  const {
    alt,
    animated,
    background,
    blur,
    dpr,
    enlarge,
    fit,
    flatten,
    flip,
    flop,
    format,
    grayscale,
    height,
    position,
    quality,
    rotate,
    sharpen,
    sizes,
    src,
    width,
    widths,
    ...imageProps
  } = input
  const attributes = createImageAttributes(config, {
    alt,
    animated,
    background,
    blur,
    dpr,
    enlarge,
    fit,
    flatten,
    flip,
    flop,
    format,
    grayscale,
    height,
    position,
    quality,
    rotate,
    sharpen,
    sizes,
    src,
    width,
    widths,
  })

  return (
    <img
      {...imageProps}
      {...attributes}
      alt={attributes.alt}
      height={attributes.height}
      width={attributes.width}
    />
  )
}

export function createKeenpixImage(config: KeenpixConfig) {
  return function ConfiguredKeenpixImage(
    props: Omit<KeenpixImageProps, 'config'>,
  ) {
    return <KeenpixImage {...props} config={config} />
  }
}
