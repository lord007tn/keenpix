import type sharp from 'sharp'
import type { TransformOptions } from '../types'

export function applyMetadataPolicy(
  pipeline: sharp.Sharp,
  opts: TransformOptions,
) {
  // sharp strips metadata by default; opt back in when the project disables it.
  return opts.stripMetadata === false ? pipeline.keepMetadata() : pipeline
}
