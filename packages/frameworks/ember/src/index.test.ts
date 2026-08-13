import { describe, expect, it } from 'vitest'

import {
  createKeenpixImageAttributesHelper,
  createKeenpixUrlHelper,
} from './index.js'

const config = { baseUrl: 'https://images.example.com' }

describe('Ember helpers', () => {
  it('creates an importable plain URL helper', () => {
    const keenpixUrl = createKeenpixUrlHelper(config)

    expect(
      keenpixUrl('https://origin.example.com/hero.jpg', {
        format: 'webp',
        width: 720,
      }),
    ).toContain('w=720')
  })

  it('creates responsive attributes without Ember runtime state', () => {
    const keenpixAttributes = createKeenpixImageAttributesHelper(config)
    const attributes = keenpixAttributes(
      'https://origin.example.com/hero.jpg',
      { alt: 'Product hero', widths: [320, 640] },
    )

    expect(attributes.srcSet).toContain('320w')
    expect(attributes.srcSet).toContain('640w')
  })
})
