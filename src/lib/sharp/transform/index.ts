import sharp from 'sharp'
import type { TransformOptions } from '@/shared/transform'
import { applyBlur } from './blur'
import { encodeFormat } from './encode'
import { applyMetadataPolicy } from './metadata'
import { createPipeline } from './pipeline'
import { applyResize } from './resize'

// libvips already parallelizes within a single pipeline; cap per-call worker
// threads so N concurrent transforms don't spawn N×CPU threads and thrash.
sharp.concurrency(1)

export interface TransformResult {
  data: Buffer
  format: string
  height: number
  size: number
  width: number
}

type TransformStep = (
  pipeline: sharp.Sharp,
  opts: TransformOptions,
) => sharp.Sharp

function getTransformSteps(opts: TransformOptions) {
  const steps: TransformStep[] = [applyResize]

  if (opts.blur && opts.blur > 0) {
    steps.push(applyBlur)
  }

  steps.push(applyMetadataPolicy, encodeFormat)
  return steps
}

export async function transformImage(
  input: Buffer,
  opts: TransformOptions,
): Promise<TransformResult> {
  let pipeline = createPipeline(input)
  for (const step of getTransformSteps(opts)) {
    pipeline = step(pipeline, opts)
  }
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true })
  return {
    data,
    width: info.width,
    height: info.height,
    format: info.format,
    size: info.size,
  }
}
