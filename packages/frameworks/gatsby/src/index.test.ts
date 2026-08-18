import { describe, expect, it } from 'vitest'
import { createGatsbyImageData, createGatsbyUrlBuilder } from './index'

describe('createGatsbyImageData', () => {
  it('builds data accepted by GatsbyImage for a CDN-backed image', () => {
    const data = createGatsbyImageData(
      { baseUrl: 'https://images.example.com', projectId: 'demo' },
      {
        formats: ['avif', 'webp'],
        height: 800,
        src: 'https://origin.example.com/hero.jpg',
        width: 1200,
        widths: [480, 960, 1200],
      },
    )

    expect(data.layout).toBe('constrained')
    expect(data.images.fallback.srcSet).toContain('480w')
    expect(data.images.sources.map((source) => source.type)).toEqual([
      'image/avif',
      'image/webp',
    ])
    expect(data.images.sources[0]?.srcSet).toContain('fmt=avif')
    expect(data.images.fallback.srcSet).toContain('h=320')
  })

  it('rejects invalid source dimensions', () => {
    expect(() =>
      createGatsbyImageData(
        { baseUrl: 'https://images.example.com' },
        { height: 800, src: '/hero.jpg', width: 0 },
      ),
    ).toThrow(RangeError)
  })

  it('provides Gatsby getImageData with a compatible URL builder', () => {
    const urlBuilder = createGatsbyUrlBuilder({
      baseUrl: 'https://images.example.com',
    })

    expect(
      urlBuilder({
        baseUrl: 'https://origin.example.com/hero.jpg',
        format: 'jpg',
        height: 400,
        width: 600,
      }),
    ).toContain('fmt=jpeg')
  })
})
