import { createAstroImageService } from './index.js'

interface AstroImageConfig {
  service?: {
    config?: {
      baseUrl?: string
      projectId?: string
      projectInPath?: boolean
      sourceMode?: 'path' | 'query'
    }
  }
}

function getService(imageConfig: AstroImageConfig) {
  const config = imageConfig.service?.config
  if (!config?.baseUrl) {
    throw new Error(
      'Keenpix Astro image service requires image.service.config.baseUrl.',
    )
  }

  return createAstroImageService({
    baseUrl: config.baseUrl,
    projectId: config.projectId,
    projectInPath: config.projectInPath,
    sourceMode: config.sourceMode,
  })
}

export default {
  getHTMLAttributes(
    options: Parameters<
      ReturnType<typeof createAstroImageService>['getHTMLAttributes']
    >[0],
    imageConfig: AstroImageConfig,
  ) {
    return getService(imageConfig).getHTMLAttributes(options)
  },
  getURL(
    options: Parameters<
      ReturnType<typeof createAstroImageService>['getURL']
    >[0],
    imageConfig: AstroImageConfig,
  ) {
    return getService(imageConfig).getURL(options)
  },
}
