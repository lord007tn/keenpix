import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { parseTransformParams } from '../params'
import { transformImage } from './index'

describe('transform color parameters', () => {
  it.each([
    'ffffff',
    'not-a-color',
    '#xyz',
    'rgb(nope)',
  ])('ignores invalid background and tint %s before calling Sharp', async (color) => {
    const options = parseTransformParams(
      new URLSearchParams({
        w: '120',
        h: '80',
        fit: 'contain',
        fmt: 'png',
        bg: color,
        tint: color,
      }),
      '',
      {
        autoFormat: false,
        defaultDpr: 1,
        defaultFit: 'cover',
        defaultQuality: 75,
        maxWidth: null,
      },
    )
    const input = await sharp({
      create: { width: 32, height: 32, channels: 4, background: '#ff0000' },
    })
      .png()
      .toBuffer()
    const result = await transformImage(input, options, {
      maxDimension: 5000,
      maxInputPixels: 1_000_000,
    })
    expect(result).toMatchObject({ width: 120, height: 80, format: 'png' })
    expect(options.background).toBeUndefined()
    expect(options.tint).toBeUndefined()
  })

  it.each([
    '#fff',
    '#ffffff',
    '#ffffff80',
    'transparent',
    'red',
    'rgb(255, 0, 0)',
    'rgba(255, 0, 0, 0.5)',
    'hsl(120, 100%, 50%)',
  ])('preserves Sharp color syntax %s', async (color) => {
    const options = parseTransformParams(
      new URLSearchParams({
        w: '120',
        h: '80',
        fit: 'contain',
        fmt: 'png',
        bg: color,
        tint: color,
      }),
      '',
      {
        autoFormat: false,
        defaultDpr: 1,
        defaultFit: 'cover',
        defaultQuality: 75,
        maxWidth: null,
      },
    )
    const input = await sharp({
      create: { width: 32, height: 32, channels: 4, background: '#ff0000' },
    })
      .png()
      .toBuffer()
    const result = await transformImage(input, options, {
      maxDimension: 5000,
      maxInputPixels: 1_000_000,
    })
    expect(result).toMatchObject({ width: 120, height: 80, format: 'png' })
    expect(options).toMatchObject({ background: color, tint: color })
  })
})
