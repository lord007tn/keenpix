import {
  buildImageUrl,
  createImageAttributes,
  type KeenpixConfig,
  type KeenpixImageInput,
  type KeenpixTransform,
} from '@keenpix/core'

export * from '@keenpix/core'

export function createQwikImageProps(
  config: KeenpixConfig,
  input: KeenpixImageInput,
) {
  return {
    decoding: 'async' as const,
    loading: 'lazy' as const,
    ...createImageAttributes(config, input),
  }
}

export interface QwikImageTransformerInput
  extends Omit<KeenpixTransform, 'height' | 'width'> {
  height?: number
  src: string
  width: number
}

export function createQwikImageTransformer(config: KeenpixConfig) {
  return ({ src, ...transform }: QwikImageTransformerInput) =>
    buildImageUrl(config, src, transform)
}

export function createQwikKeenpix(config: KeenpixConfig) {
  return {
    imageProps: (input: KeenpixImageInput) =>
      createQwikImageProps(config, input),
    imageTransformer: createQwikImageTransformer(config),
  }
}
