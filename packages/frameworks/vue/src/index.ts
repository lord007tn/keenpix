import {
  createImageAttributes,
  type KeenpixConfig,
  type KeenpixImageInput,
} from '@keenpix/core'
import { type HTMLAttributes, h } from 'vue'

export * from '@keenpix/core'

export function createVueImageProps(
  config: KeenpixConfig,
  input: KeenpixImageInput,
) {
  const { srcSet, ...attributes } = createImageAttributes(config, input)

  return {
    ...attributes,
    srcset: srcSet,
  }
}

export interface KeenpixImageProps
  extends KeenpixImageInput,
    Omit<
      HTMLAttributes,
      'alt' | 'height' | 'sizes' | 'src' | 'srcset' | 'width'
    > {}

export function createKeenpixImage(config: KeenpixConfig) {
  return (props: KeenpixImageProps) => {
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
    } = props
    const attributes = createVueImageProps(config, {
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

    return h('img', { ...imageProps, ...attributes })
  }
}

export function createVueKeenpix(config: KeenpixConfig) {
  return {
    Image: createKeenpixImage(config),
    imageProps: (input: KeenpixImageInput) =>
      createVueImageProps(config, input),
  }
}
