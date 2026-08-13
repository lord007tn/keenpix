import { IMAGE_LOADER, type ImageLoaderConfig } from '@angular/common'
import {
  buildImageUrl,
  type KeenpixConfig,
  type KeenpixTransform,
} from '@keenpix/core'

export * from '@keenpix/core'

export type KeenpixAngularLoaderParams = Omit<
  KeenpixTransform,
  'height' | 'width'
>

export function createAngularImageLoader(config: KeenpixConfig) {
  return (input: ImageLoaderConfig) => {
    const loaderParams = input.loaderParams as
      | KeenpixAngularLoaderParams
      | undefined

    return buildImageUrl(config, input.src, {
      ...loaderParams,
      height: input.height,
      width: input.width,
    })
  }
}

export function provideKeenpixImageLoader(config: KeenpixConfig) {
  return {
    provide: IMAGE_LOADER,
    useValue: createAngularImageLoader(config),
  }
}
