import { describe, expect, it } from 'vitest'
import {
  createReactNativeImageProps,
  createReactNativeImageSource,
  createReactNativeImageSources,
} from './index'

const config = { baseUrl: 'https://images.example.com' }

describe('React Native integration', () => {
  it('creates a network Image source with explicit dimensions', () => {
    expect(
      createReactNativeImageSource(
        config,
        '/avatar.jpg',
        { height: 128, width: 128 },
        { cache: 'force-cache' },
      ),
    ).toMatchObject({ cache: 'force-cache', height: 128, width: 128 })
  })

  it('builds dimensioned sources that React Native can choose between', () => {
    const sources = createReactNativeImageSources(
      config,
      '/hero.jpg',
      [1200, 600],
      { aspectRatio: 1.5 },
    )

    expect(sources.map(({ height, width }) => [width, height])).toEqual([
      [600, 400],
      [1200, 800],
    ])
  })

  it('rejects invalid aspect ratios', () => {
    expect(() =>
      createReactNativeImageSources(config, '/hero.jpg', [600], {
        aspectRatio: 0,
      }),
    ).toThrow(RangeError)
  })

  it('maps accessible text and resize behavior to Image props', () => {
    expect(
      createReactNativeImageProps(config, {
        alt: 'Profile photo',
        fit: 'fill',
        src: '/avatar.jpg',
      }),
    ).toMatchObject({
      accessibilityLabel: 'Profile photo',
      resizeMode: 'stretch',
    })
  })
})
