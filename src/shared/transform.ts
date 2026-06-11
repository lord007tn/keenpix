export type OutputFormat =
  | 'avif'
  | 'gif'
  | 'heif'
  | 'jpeg'
  | 'png'
  | 'tiff'
  | 'webp'
export type Fit = 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
export type ResizeKernel =
  | 'cubic'
  | 'lanczos2'
  | 'lanczos3'
  | 'linear'
  | 'mitchell'
  | 'mks2013'
  | 'mks2021'
  | 'nearest'
export type ResizePosition =
  | 'attention'
  | 'bottom'
  | 'center'
  | 'centre'
  | 'east'
  | 'entropy'
  | 'left'
  | 'left bottom'
  | 'left top'
  | 'north'
  | 'northeast'
  | 'northwest'
  | 'right'
  | 'right bottom'
  | 'right top'
  | 'south'
  | 'southeast'
  | 'southwest'
  | 'top'
  | 'west'
export type ExtendWith = 'background' | 'copy' | 'mirror' | 'repeat'

export interface ExtractOptions {
  height: number
  left: number
  top: number
  width: number
}

export interface ExtendOptions {
  bottom: number
  extendWith?: ExtendWith
  left: number
  right: number
  top: number
}

export interface GammaOptions {
  gamma: number
  gammaOut?: number
}

export interface ModulateOptions {
  brightness?: number
  hue?: number
  lightness?: number
  saturation?: number
}

const CONTENT_TYPE: Record<OutputFormat, string> = {
  avif: 'image/avif',
  gif: 'image/gif',
  heif: 'image/heif',
  jpeg: 'image/jpeg',
  png: 'image/png',
  tiff: 'image/tiff',
  webp: 'image/webp',
}

export interface TransformOptions {
  animated?: boolean
  background?: string
  blur?: number
  dpr?: number
  enlarge?: boolean
  extend?: ExtendOptions
  extract?: ExtractOptions
  fit: Fit
  flatten?: boolean
  flip?: boolean
  flop?: boolean
  format: OutputFormat
  gamma?: GammaOptions
  grayscale?: boolean
  height?: number
  kernel?: ResizeKernel
  median?: number
  modulate?: ModulateOptions
  negate?: boolean
  normalize?: boolean
  position?: ResizePosition
  quality: number
  rotate?: number
  sharpen?: number | true
  stripMetadata?: boolean
  threshold?: number
  tint?: string
  trim?: number | true
  width?: number
}

export function getContentType(format: OutputFormat) {
  return CONTENT_TYPE[format]
}
