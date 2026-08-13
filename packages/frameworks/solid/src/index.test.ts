import { describe, expect, it } from 'vitest'
import { createSolidImageProps } from './index.js'

describe('createSolidImageProps', () => {
  it('returns JSX-compatible responsive props', () => {
    expect(
      createSolidImageProps(
        { baseUrl: 'https://img.test' },
        { alt: 'Hero', src: 'hero.jpg', widths: [480, 960] },
      ).srcSet,
    ).toContain('w=960 960w')
  })
})
