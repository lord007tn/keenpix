import { describe, expect, it } from 'vitest'
import { createSvelteKitKeenpix } from './index.js'

describe('createSvelteKitKeenpix', () => {
  it('shares one config between SSR-safe props and loaders', () => {
    const keenpix = createSvelteKitKeenpix({ baseUrl: 'https://img.test' })

    expect(keenpix.loader({ src: 'hero.jpg', width: 640 })).toBe(
      'https://img.test/img/hero.jpg?w=640',
    )
    expect(
      keenpix.imageProps({ alt: 'Hero', src: 'hero.jpg', width: 640 }).src,
    ).toBe('https://img.test/img/hero.jpg?w=640')
  })
})
