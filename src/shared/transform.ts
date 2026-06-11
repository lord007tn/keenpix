export type OutputFormat = 'avif' | 'webp' | 'jpeg' | 'png'
export type Fit = 'cover' | 'contain' | 'fill' | 'inside'

const CONTENT_TYPE: Record<OutputFormat, string> = {
  avif: 'image/avif',
  webp: 'image/webp',
  jpeg: 'image/jpeg',
  png: 'image/png',
}

export interface TransformOptions {
  blur?: number
  dpr?: number
  fit: Fit
  format: OutputFormat
  height?: number
  quality: number
  stripMetadata?: boolean
  width?: number
}

export function getContentType(format: OutputFormat) {
  return CONTENT_TYPE[format]
}
