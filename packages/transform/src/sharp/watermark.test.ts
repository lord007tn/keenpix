import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { transformImage } from './index'

describe('watermark overlay', () => {
  it('applies a scaled translucent project watermark', async () => {
    const source = await sharp({
      create: {
        background: '#ffffff',
        channels: 3,
        height: 100,
        width: 200,
      },
    })
      .png()
      .toBuffer()
    const watermark = await sharp({
      create: {
        background: '#ff0000',
        channels: 4,
        height: 20,
        width: 40,
      },
    })
      .png()
      .toBuffer()

    const result = await transformImage(
      source,
      {
        fit: 'cover',
        format: 'png',
        height: 100,
        quality: 80,
        watermark: {
          margin: 4,
          opacity: 50,
          position: 'southeast',
          scale: 20,
          url: 'https://images.example.com/watermark.png',
        },
        width: 200,
      },
      {
        maxDimension: 5000,
        maxInputPixels: 40_000_000,
        watermarkBytes: watermark,
      },
    )

    expect(result.width).toBe(200)
    expect(result.height).toBe(100)
    expect(result.data.equals(source)).toBe(false)
  })
})
