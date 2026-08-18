import { describe, expect, it } from 'vitest'
import { createQwikKeenpix } from './index.js'

describe('createQwikKeenpix', () => {
  it('creates serializable zero-state image props and transformer URLs', () => {
    const keenpix = createQwikKeenpix({ baseUrl: 'https://img.test' })

    expect(
      keenpix.imageProps({ alt: 'Hero', src: 'hero.jpg', width: 640 }),
    ).toMatchObject({
      decoding: 'async',
      loading: 'lazy',
      src: 'https://img.test/img/hero.jpg?w=640',
    })
    expect(
      keenpix.imageTransformer({ height: 360, src: 'hero.jpg', width: 640 }),
    ).toBe('https://img.test/img/hero.jpg?h=360&w=640')
  })
})
