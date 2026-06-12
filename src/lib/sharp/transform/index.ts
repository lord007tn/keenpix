import sharp from 'sharp'
import type { TransformOptions } from '@/shared/transform'
import { applyBlur } from './blur'
import { encodeFormat } from './encode'
import { applyExtend } from './extend'
import { applyExtract } from './extract'
import { applyFlatten } from './flatten'
import { applyFlip } from './flip'
import { applyGamma } from './gamma'
import { applyGrayscale } from './grayscale'
import { applyMedian } from './median'
import { applyMetadataPolicy } from './metadata'
import { applyModulate } from './modulate'
import { applyNegate } from './negate'
import { applyNormalize } from './normalize'
import { createPipeline } from './pipeline'
import { applyResize } from './resize'
import { applyRotate } from './rotate'
import { applySharpen } from './sharpen'
import { applyThreshold } from './threshold'
import { applyTint } from './tint'
import { applyTrim } from './trim'
import type { TransformStep } from './types'

// libvips already parallelizes within a single pipeline; cap per-call worker
// threads so N concurrent transforms don't spawn N×CPU threads and thrash.
sharp.concurrency(1)

function getTransformSteps(opts: TransformOptions) {
  const steps: TransformStep[] = []

  if (opts.extract) {
    steps.push(applyExtract)
  }

  if (opts.trim) {
    steps.push(applyTrim)
  }

  if (opts.rotate) {
    steps.push(applyRotate)
  }

  if (opts.flip || opts.flop) {
    steps.push(applyFlip)
  }

  steps.push(applyResize)

  if (opts.extend) {
    steps.push(applyExtend)
  }

  if (opts.flatten) {
    steps.push(applyFlatten)
  }

  if (opts.grayscale) {
    steps.push(applyGrayscale)
  }

  if (opts.tint) {
    steps.push(applyTint)
  }

  if (opts.modulate) {
    steps.push(applyModulate)
  }

  if (opts.gamma) {
    steps.push(applyGamma)
  }

  if (opts.negate) {
    steps.push(applyNegate)
  }

  if (opts.normalize) {
    steps.push(applyNormalize)
  }

  if (opts.threshold !== undefined) {
    steps.push(applyThreshold)
  }

  if (opts.median) {
    steps.push(applyMedian)
  }

  if (opts.blur && opts.blur > 0) {
    steps.push(applyBlur)
  }

  if (opts.sharpen) {
    steps.push(applySharpen)
  }

  steps.push(applyMetadataPolicy, encodeFormat)
  return steps
}

export async function transformImage(input: Buffer, opts: TransformOptions) {
  let pipeline = createPipeline(input, opts)
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
