import {
  createKeenpix,
  type KeenpixConfig,
  type KeenpixTransform,
} from '@keenpix/core'
import {
  createHtmlImageAttributes,
  type KeenpixHtmlImageInput,
  renderKeenpixImage,
} from '@keenpix/html'

export * from '@keenpix/core'

export interface KeenpixEleventyPluginOptions {
  config: KeenpixConfig
  imageShortcodeName?: string
  urlFilterName?: string
}

export interface KeenpixEleventyConfig {
  addFilter: (name: string, callback: (...values: unknown[]) => unknown) => void
  addShortcode: (
    name: string,
    callback: (...values: unknown[]) => unknown,
  ) => void
}

export const createEleventyImageAttributes = createHtmlImageAttributes

export function keenpixEleventyPlugin(
  eleventyConfig: KeenpixEleventyConfig,
  options: KeenpixEleventyPluginOptions,
) {
  const images = createKeenpix(options.config)

  eleventyConfig.addFilter(
    options.urlFilterName ?? 'keenpixUrl',
    (src, transform) =>
      images.url(src as string, transform as KeenpixTransform | undefined),
  )
  eleventyConfig.addShortcode(
    options.imageShortcodeName ?? 'keenpixImage',
    (src, alt, input) =>
      renderKeenpixImage(options.config, {
        ...(input as Omit<KeenpixHtmlImageInput, 'alt' | 'src'> | undefined),
        alt: alt as string,
        src: src as string,
      }),
  )
}

export default keenpixEleventyPlugin
