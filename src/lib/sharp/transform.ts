import sharp from 'sharp'
import { env } from '@/env/server'

// libvips already parallelizes within a single pipeline; cap per-call worker
// threads so N concurrent transforms don't spawn N×CPU threads and thrash.
sharp.concurrency(1)

/**
 * Decode-time pixel ceiling on the *input* image (width × height). Guards against
 * decompression bombs — a tiny compressed file that expands to a huge raw bitmap.
 * Override with KEENPIX_MAX_INPUT_PIXELS; defaults to ~50 MP.
 */
const MAX_INPUT_PIXELS = env.KEENPIX_MAX_INPUT_PIXELS

/**
 * Longest output side when a request gives NO explicit w/h. Without this a
 * full-resolution re-encode of a huge source (e.g. a 36 MP original to AVIF)
 * can pin a CPU for tens of seconds. Bounds that worst case; never upscales.
 * Override with KEENPIX_MAX_DIMENSION.
 */
const MAX_DIMENSION = env.KEENPIX_MAX_DIMENSION

export type OutputFormat = 'avif' | 'webp' | 'jpeg' | 'png'
export type Fit = 'cover' | 'contain' | 'fill' | 'inside'

export interface TransformOptions {
  /** gaussian blur sigma (0.3–1000); omitted/0 = no blur */
  blur?: number
  /** device pixel ratio — multiplies the target dimensions (1–3) */
  dpr?: number
  fit: Fit
  format: OutputFormat
  height?: number
  quality: number
  /** false = keep EXIF/GPS/ICC in the output. Default (true/undefined) strips. */
  stripMetadata?: boolean
  width?: number
}

export interface TransformResult {
  contentType: string
  data: Buffer
  format: string
  height: number
  size: number
  width: number
}

const CONTENT_TYPE: Record<OutputFormat, string> = {
  avif: 'image/avif',
  webp: 'image/webp',
  jpeg: 'image/jpeg',
  png: 'image/png',
}

export function contentTypeFor(format: OutputFormat): string {
  return CONTENT_TYPE[format]
}

/** Decode + auto-orient (honours EXIF rotation) into a sharp pipeline. */
function createPipeline(input: Buffer): sharp.Sharp {
  return sharp(input, {
    failOn: 'truncated',
    limitInputPixels: MAX_INPUT_PIXELS,
  }).rotate()
}

/** Resize to the (dpr-scaled) target box; never upscales past the source. */
function applyResize(
  pipeline: sharp.Sharp,
  opts: TransformOptions,
): sharp.Sharp {
  const dpr = opts.dpr && opts.dpr > 1 ? opts.dpr : 1
  const width = opts.width ? Math.round(opts.width * dpr) : undefined
  const height = opts.height ? Math.round(opts.height * dpr) : undefined
  if (!(width || height)) {
    // No explicit size: bound the longest side so a full-res re-encode of a
    // huge source can't pin the CPU. Smaller sources pass through untouched.
    return pipeline.resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
  }
  return pipeline.resize({
    width,
    height,
    fit: opts.fit,
    withoutEnlargement: true,
  })
}

/** Post-resize effects (currently gaussian blur). */
function applyBlur(pipeline: sharp.Sharp, opts: TransformOptions): sharp.Sharp {
  return pipeline.blur(Math.min(1000, Math.max(0.3, opts.blur ?? 0.3)))
}

function applyMetadataPolicy(
  pipeline: sharp.Sharp,
  opts: TransformOptions,
): sharp.Sharp {
  // sharp strips metadata by default; opt back in when the project disables it.
  return opts.stripMetadata === false ? pipeline.keepMetadata() : pipeline
}

/** Encode to the requested output format at the given quality. */
function encodeFormat(
  pipeline: sharp.Sharp,
  opts: TransformOptions,
): sharp.Sharp {
  switch (opts.format) {
    case 'avif':
      // effort 4 is the default and very slow; 3 roughly halves encode CPU for
      // a negligible size difference — matters on the cache-MISS hot path.
      return pipeline.avif({ quality: opts.quality, effort: 3 })
    case 'webp':
      return pipeline.webp({ quality: opts.quality })
    case 'png':
      return pipeline.png()
    default:
      return pipeline.jpeg({ quality: opts.quality, progressive: true })
  }
}

type TransformStep = (
  pipeline: sharp.Sharp,
  opts: TransformOptions,
) => sharp.Sharp

function buildTransformSteps(opts: TransformOptions): TransformStep[] {
  const steps: TransformStep[] = [applyResize]

  if (opts.blur && opts.blur > 0) {
    steps.push(applyBlur)
  }

  steps.push(applyMetadataPolicy, encodeFormat)
  return steps
}

/** Full pipeline: bytes in → optimized bytes + output metadata. */
export async function transformImage(
  input: Buffer,
  opts: TransformOptions,
): Promise<TransformResult> {
  let pipeline = createPipeline(input)
  for (const step of buildTransformSteps(opts)) {
    pipeline = step(pipeline, opts)
  }
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true })
  return {
    data,
    contentType: CONTENT_TYPE[opts.format],
    width: info.width,
    height: info.height,
    format: info.format,
    size: info.size,
  }
}
