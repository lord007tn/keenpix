import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { transformImage } from './transform'

function createSample() {
  return sharp({
    create: {
      width: 80,
      height: 60,
      channels: 4,
      background: { r: 20, g: 120, b: 220, alpha: 0.5 },
    },
  })
    .png()
    .toBuffer()
}

describe('transformImage', () => {
  it('applies crop, resize, flatten, and background modifiers', async () => {
    const result = await transformImage(await createSample(), {
      background: '#ffffff',
      extract: { left: 10, top: 10, width: 40, height: 30 },
      fit: 'cover',
      flatten: true,
      format: 'jpeg',
      height: 20,
      quality: 80,
      width: 20,
    })

    expect(result.format).toBe('jpeg')
    expect(result.width).toBe(20)
    expect(result.height).toBe(20)
  })

  it('applies extended sharp modifiers from separate steps', async () => {
    const result = await transformImage(await createSample(), {
      blur: 1,
      extend: { top: 2, right: 4, bottom: 2, left: 4 },
      fit: 'fill',
      flop: true,
      format: 'webp',
      gamma: { gamma: 2.2 },
      grayscale: true,
      height: 32,
      modulate: { brightness: 1.1, saturation: 0.8 },
      normalize: true,
      quality: 75,
      rotate: 90,
      sharpen: true,
      width: 48,
    })

    expect(result.format).toBe('webp')
    expect(result.width).toBe(56)
    expect(result.height).toBe(36)
  })
})
