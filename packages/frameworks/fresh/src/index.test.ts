import { describe, expect, it } from 'vitest'

import { createKeenpixImage, KeenpixImage } from './index.js'

const config = { baseUrl: 'https://images.example.com' }

describe('Fresh image component', () => {
  it('returns a server-renderable Preact image vnode', () => {
    const image = KeenpixImage({
      alt: 'Product hero',
      config,
      loading: 'lazy',
      src: 'https://origin.example.com/hero.jpg',
      width: 800,
    })

    expect(image.type).toBe('img')
    expect(image.props.alt).toBe('Product hero')
    expect(image.props.loading).toBe('lazy')
    expect(image.props.src).toContain('w=800')
  })

  it('can bind configuration once for reuse across Fresh routes', () => {
    const Image = createKeenpixImage(config)
    const image = Image({
      alt: 'Product hero',
      src: 'https://origin.example.com/hero.jpg',
    })

    expect(image.type).toBe(KeenpixImage)
    expect(image.props.config).toBe(config)
  })
})
