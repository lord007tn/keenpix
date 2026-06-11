import { describe, expect, it } from 'vitest'
import { parseTransformParams } from './params'

function parse(query: string) {
  return parseTransformParams(new URLSearchParams(query), '', {
    autoFormat: true,
    defaultQuality: 75,
  })
}

describe('parseTransformParams', () => {
  it('accepts IPX-style sizing aliases and fit outside', () => {
    expect(parse('s=320x240&fit=outside')).toMatchObject({
      width: 320,
      height: 240,
      fit: 'outside',
    })
    expect(parse('resize=x180&w=640')).toMatchObject({
      width: 640,
      height: 180,
    })
  })

  it('parses crop anchor, background, flatten, and upscale controls', () => {
    expect(
      parse('pos=left-top&background=%23fff&flatten&enlarge=1&kernel=nearest'),
    ).toMatchObject({
      background: '#fff',
      enlarge: true,
      flatten: true,
      kernel: 'nearest',
      position: 'left top',
    })
  })

  it('parses geometry and pixel operation modifiers', () => {
    expect(
      parse(
        'extract=1,2,30,40&extend=4,8,12,16&trim=22&rotate=45&flip=true&flop=true',
      ),
    ).toMatchObject({
      extract: { left: 1, top: 2, width: 30, height: 40 },
      extend: { top: 4, right: 8, bottom: 12, left: 16 },
      trim: 22,
      rotate: 45,
      flip: true,
      flop: true,
    })
  })

  it('parses colour and adjustment modifiers', () => {
    expect(
      parse(
        'sharpen=2&median=3&gamma=2.2&gammaOut=1.8&negate=1&normalize=1&threshold=128&brightness=1.2&saturation=.8&hue=90&lightness=4&tint=red&grayscale=1&a=1&fmt=tiff',
      ),
    ).toMatchObject({
      animated: true,
      format: 'tiff',
      gamma: { gamma: 2.2, gammaOut: 1.8 },
      grayscale: true,
      median: 3,
      modulate: {
        brightness: 1.2,
        saturation: 0.8,
        hue: 90,
        lightness: 4,
      },
      negate: true,
      normalize: true,
      sharpen: 2,
      threshold: 128,
      tint: 'red',
    })
  })
})
