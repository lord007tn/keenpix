import { describe, expect, it } from 'vitest'

import { createLitImageAttributes, keenpixImage } from './index.js'

const config = { baseUrl: 'https://images.example.com' }

describe('Lit image template', () => {
  it('creates Lit-friendly image attributes', () => {
    const attributes = createLitImageAttributes(config, {
      alt: 'Product hero',
      className: 'hero',
      loading: 'lazy',
      src: 'https://origin.example.com/hero.jpg',
      width: 640,
    })

    expect(attributes.className).toBe('hero')
    expect(attributes.loading).toBe('lazy')
    expect(attributes.src).toContain('w=640')
  })

  it('returns a native Lit template result', () => {
    const template = keenpixImage(config, {
      alt: 'Product hero',
      src: 'https://origin.example.com/hero.jpg',
      widths: [320, 640],
    })

    expect(template.strings.join('')).toContain('<img')
    expect(
      template.values.some((value) => String(value).includes('/img/')),
    ).toBe(true)
  })
})
