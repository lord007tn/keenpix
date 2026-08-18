import sharp from 'sharp'
import type { TransformOptions } from '../types'

export async function applyWatermark(
  pipeline: sharp.Sharp,
  options: TransformOptions,
  watermarkBytes: Buffer,
) {
  const watermark = options.watermark
  if (!watermark) {
    return pipeline
  }
  const outputMetadata = await pipeline.clone().metadata()
  const outputWidth = outputMetadata.width
  if (!outputWidth) {
    return pipeline
  }
  const width = Math.max(1, Math.round((outputWidth * watermark.scale) / 100))
  const resized = sharp(watermarkBytes, {
    failOn: 'error',
    limitInputPixels: 40_000_000,
  })
    .ensureAlpha()
    .resize({ fit: 'inside', width, withoutEnlargement: true })
  const { data, info } = await resized.toBuffer({ resolveWithObject: true })
  const alpha = Math.min(1, Math.max(0.01, watermark.opacity / 100))
  const padded = await sharp(data)
    .composite([
      {
        blend: 'dest-in',
        input: {
          create: {
            background: { alpha, b: 0, g: 0, r: 0 },
            channels: 4,
            height: info.height,
            width: info.width,
          },
        },
      },
    ])
    .extend({
      background: { alpha: 0, b: 0, g: 0, r: 0 },
      bottom: watermark.margin,
      left: watermark.margin,
      right: watermark.margin,
      top: watermark.margin,
    })
    .png()
    .toBuffer()

  return pipeline.composite([
    {
      blend: 'over',
      gravity: watermark.position,
      input: padded,
    },
  ])
}
