import { describe, expect, it } from 'vitest'
import { parseTransformParams } from './params'

describe('parseTransformParams', () => {
  it('negotiates an automatic output format and clamps the project width', () => {
    expect(
      parseTransformParams(
        new URLSearchParams('fmt=auto&w=2400&q=80'),
        'image/avif,image/webp',
        {
          autoFormat: true,
          defaultDpr: 1,
          defaultFit: 'cover',
          defaultQuality: 75,
          maxWidth: 1600,
        },
      ),
    ).toMatchObject({ format: 'avif', quality: 80, width: 1600 })
  })
})
