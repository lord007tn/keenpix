import { describe, expect, it } from 'vitest'
import { createAstroImageService } from './index.js'

describe('createAstroImageService', () => {
  it('implements Astro external image service URL generation', () => {
    const service = createAstroImageService({ baseUrl: 'https://img.test' })

    expect(
      service.getURL({
        format: 'jpg',
        height: 450,
        quality: 80,
        src: 'hero.jpg',
        width: 800,
      }),
    ).toBe('https://img.test/img/hero.jpg?fmt=jpeg&h=450&q=80&w=800')
  })

  it('preserves render attributes and removes service-only options', () => {
    const service = createAstroImageService({ baseUrl: 'https://img.test' })

    expect(
      service.getHTMLAttributes({
        alt: 'Hero',
        blur: 2,
        height: 450,
        loading: 'eager',
        src: 'hero.jpg',
        width: 800,
      }),
    ).toEqual({
      alt: 'Hero',
      decoding: 'async',
      height: 450,
      loading: 'eager',
      width: 800,
    })
  })
})
