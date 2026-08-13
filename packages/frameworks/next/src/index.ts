import {
  buildImageUrl,
  type KeenpixConfig,
  type KeenpixImageInput,
  type KeenpixTransform,
} from '@keenpix/core'

export * from '@keenpix/core'

export interface NextImageLoaderInput {
  quality?: number
  src: string
  width: number
}

export interface KeenpixNextImageInput
  extends Omit<KeenpixImageInput, 'widths'> {
  fill?: boolean
}

export function createNextLoader(
  config: KeenpixConfig,
  transform: Omit<KeenpixTransform, 'quality' | 'width'> = {},
) {
  return ({ quality, src, width }: NextImageLoaderInput) =>
    buildImageUrl(config, src, { ...transform, quality, width })
}

export function createNextImageProps(
  config: KeenpixConfig,
  input: KeenpixNextImageInput,
) {
  const {
    alt,
    animated,
    background,
    blur,
    dpr,
    enlarge,
    fill,
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
  } = input

  return {
    alt,
    fill,
    height,
    loader: ({
      quality: requestedQuality,
      src: requestedSrc,
      width: requestedWidth,
    }: NextImageLoaderInput) =>
      buildImageUrl(config, requestedSrc, {
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
        height:
          height && width
            ? Math.round((requestedWidth * height) / width)
            : undefined,
        position,
        quality: requestedQuality,
        rotate,
        sharpen,
        width: requestedWidth,
      }),
    quality,
    sizes,
    src,
    width,
  }
}
