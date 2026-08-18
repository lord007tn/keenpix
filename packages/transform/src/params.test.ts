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

  it('resolves automatic width and DPR from Client Hints before clamping', () => {
    expect(
      parseTransformParams(
        new URLSearchParams('w=auto&dpr=auto'),
        'image/webp',
        {
          autoFormat: true,
          defaultDpr: 1,
          defaultFit: 'cover',
          defaultQuality: 75,
          maxWidth: 1200,
        },
        { dpr: '2.5', viewportWidth: '1440', width: '1600' },
      ),
    ).toMatchObject({ dpr: 2.5, width: 640 })
  })

  it('falls back to project defaults when automatic hints are absent', () => {
    expect(
      parseTransformParams(new URLSearchParams('w=auto&dpr=auto'), '', {
        autoFormat: false,
        defaultDpr: 2,
        defaultFit: 'inside',
        defaultQuality: 80,
        maxWidth: null,
      }),
    ).toMatchObject({ dpr: 2, width: undefined })
  })

  it('buckets automatic hints to bound public cache cardinality', () => {
    expect(
      parseTransformParams(
        new URLSearchParams('w=auto&dpr=auto'),
        '',
        {
          autoFormat: false,
          defaultDpr: 1,
          defaultFit: 'cover',
          defaultQuality: 75,
          maxWidth: null,
        },
        { dpr: '2.61', viewportWidth: '711' },
      ),
    ).toMatchObject({ dpr: 2.5, width: 768 })
  })
})
