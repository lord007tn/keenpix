import { describe, expect, it } from 'vitest'
import { createSolidStartKeenpix } from './index.js'

describe('createSolidStartKeenpix', () => {
  it('uses the Solid adapter for isomorphic image props', () => {
    const keenpix = createSolidStartKeenpix({ baseUrl: 'https://img.test' })

    expect(
      keenpix.imageProps({ alt: 'Hero', src: 'hero.jpg', width: 900 }).src,
    ).toBe('https://img.test/img/hero.jpg?w=900')
  })
})
