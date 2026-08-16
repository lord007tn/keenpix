export type KeenpixFormat =
  | 'auto'
  | 'avif'
  | 'gif'
  | 'heif'
  | 'jpeg'
  | 'png'
  | 'svg'
  | 'tiff'
  | 'webp'

export type KeenpixFit = 'contain' | 'cover' | 'fill' | 'inside' | 'outside'

export interface KeenpixConfig {
  baseUrl: string
  projectId?: string
  projectInPath?: boolean
  sourceMode?: 'path' | 'query'
}

export interface KeenpixTransform {
  animated?: boolean
  background?: string
  blur?: number
  dpr?: number | 'auto'
  enlarge?: boolean
  fit?: KeenpixFit
  flatten?: boolean
  flip?: boolean
  flop?: boolean
  format?: KeenpixFormat
  grayscale?: boolean
  height?: number
  position?: string
  quality?: number
  rotate?: number
  sharpen?: number | true
  width?: number | 'auto'
}

export interface KeenpixLoaderInput {
  format?: KeenpixFormat
  quality?: number
  src: string
  width: number
}

export interface KeenpixImageInput
  extends Omit<KeenpixTransform, 'height' | 'width'> {
  alt: string
  height?: number
  sizes?: string
  src: string
  width?: number
  widths?: number[]
}

const TRANSFORM_PARAMS = {
  animated: 'animated',
  background: 'background',
  blur: 'blur',
  dpr: 'dpr',
  enlarge: 'enlarge',
  fit: 'fit',
  flatten: 'flatten',
  flip: 'flip',
  flop: 'flop',
  format: 'fmt',
  grayscale: 'grayscale',
  height: 'h',
  position: 'position',
  quality: 'q',
  rotate: 'rotate',
  sharpen: 'sharpen',
  width: 'w',
} as const

const TRAILING_SLASHES = /\/+$/
const LEADING_SLASHES = /^\/+/
const MANAGED_DELIVERY_ORIGIN = 'https://cdn.keenpix.com'

export function createManagedKeenpixConfig(projectId: string) {
  return {
    baseUrl: MANAGED_DELIVERY_ORIGIN,
    projectId,
    projectInPath: true,
  } satisfies KeenpixConfig
}

function setTransformParams(
  searchParams: URLSearchParams,
  transform: KeenpixTransform,
) {
  for (const [key, param] of Object.entries(TRANSFORM_PARAMS)) {
    const value = transform[key as keyof KeenpixTransform]
    if (value === undefined || value === false) {
      continue
    }
    searchParams.set(param, value === true ? '1' : String(value))
  }
}

export function buildImageUrl(
  config: KeenpixConfig,
  src: string,
  transform: KeenpixTransform = {},
) {
  const configuredBaseUrl = config.baseUrl.replace(TRAILING_SLASHES, '')
  const configuredHostname = new URL(configuredBaseUrl).hostname.toLowerCase()
  const managedFirstParty = [
    'cdn.keenpix.com',
    'keenpix.com',
    'www.keenpix.com',
  ].includes(configuredHostname)
  const baseUrl = managedFirstParty
    ? MANAGED_DELIVERY_ORIGIN
    : configuredBaseUrl
  const projectPath =
    (managedFirstParty || config.projectInPath) && config.projectId
      ? `/p/${encodeURIComponent(config.projectId)}`
      : ''
  const sourceMode = config.sourceMode ?? 'path'
  const sourcePath =
    sourceMode === 'path'
      ? `/${encodeURIComponent(src.replace(LEADING_SLASHES, ''))}`
      : ''
  const url = new URL(`${baseUrl}${projectPath}/img${sourcePath}`)

  if (sourceMode === 'query') {
    url.searchParams.set('url', src)
  }
  if (config.projectId && !(managedFirstParty || config.projectInPath)) {
    url.searchParams.set('project', config.projectId)
  }

  setTransformParams(url.searchParams, transform)
  return url.toString()
}

export function buildSrcSet(
  config: KeenpixConfig,
  src: string,
  widths: number[],
  transform: Omit<KeenpixTransform, 'width'> = {},
) {
  return [...new Set(widths)]
    .filter((width) => Number.isInteger(width) && width > 0)
    .sort((a, b) => a - b)
    .map(
      (width) =>
        `${buildImageUrl(config, src, { ...transform, width })} ${width}w`,
    )
    .join(', ')
}

export function createKeenpixLoader(config: KeenpixConfig) {
  return ({ format, quality, src, width }: KeenpixLoaderInput) =>
    buildImageUrl(config, src, { format, quality, width })
}

export function createKeenpix(config: KeenpixConfig) {
  return {
    loader: createKeenpixLoader(config),
    srcSet: (
      src: string,
      widths: number[],
      transform?: Omit<KeenpixTransform, 'width'>,
    ) => buildSrcSet(config, src, widths, transform),
    url: (src: string, transform?: KeenpixTransform) =>
      buildImageUrl(config, src, transform),
  }
}

export function createImageAttributes(
  config: KeenpixConfig,
  input: KeenpixImageInput,
) {
  const { alt, height, sizes, src, width, widths, ...transform } = input
  const resolvedWidth = width ?? widths?.at(-1)

  return {
    alt,
    height,
    sizes,
    src: buildImageUrl(config, src, {
      ...transform,
      height,
      width: resolvedWidth,
    }),
    srcSet: widths?.length
      ? [...new Set(widths)]
          .filter(
            (candidateWidth) =>
              Number.isInteger(candidateWidth) && candidateWidth > 0,
          )
          .sort((a, b) => a - b)
          .map((candidateWidth) => {
            const candidateHeight =
              height && resolvedWidth
                ? Math.round((candidateWidth * height) / resolvedWidth)
                : height
            return `${buildImageUrl(config, src, {
              ...transform,
              height: candidateHeight,
              width: candidateWidth,
            })} ${candidateWidth}w`
          })
          .join(', ')
      : undefined,
    width,
  }
}

export function canonicalSignaturePayload(
  src: string,
  searchParams: URLSearchParams,
) {
  const pairs: string[] = []
  for (const [key, value] of searchParams.entries()) {
    if (key !== 'sig') {
      pairs.push(`${key}=${value}`)
    }
  }
  pairs.sort()
  return `${src}\n${pairs.join('&')}`
}
