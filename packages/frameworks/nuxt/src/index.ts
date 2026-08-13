import {
  buildImageUrl,
  type KeenpixConfig,
  type KeenpixTransform,
} from '@keenpix/core'

export * from '@keenpix/core'
export * from '@keenpix/vue'

export interface NuxtImageProviderOptions
  extends Omit<KeenpixConfig, 'baseUrl'> {
  baseURL: string
}

export interface NuxtImageProviderRequest {
  baseURL?: string
  modifiers?: KeenpixTransform
}

const LEADING_SLASHES = /^\/+/

export function createNuxtImageProvider(
  defaults: Partial<NuxtImageProviderOptions> = {},
) {
  return {
    getImage(src: string, options: NuxtImageProviderRequest = {}) {
      const baseUrl = options.baseURL ?? defaults.baseURL
      if (!baseUrl) {
        throw new Error(
          'Keenpix Nuxt Image provider requires a baseURL option.',
        )
      }

      return {
        url: buildImageUrl(
          {
            baseUrl,
            projectId: defaults.projectId,
            projectInPath: defaults.projectInPath,
            sourceMode: defaults.sourceMode,
          },
          src.replace(LEADING_SLASHES, ''),
          options.modifiers,
        ),
      }
    },
  }
}
