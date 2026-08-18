import { describe, expect, it } from 'vitest'
import {
  createExpoImageProps,
  createExpoImageSource,
  createExpoImageSources,
} from './index'

const config = { baseUrl: 'https://images.example.com' }

describe('Expo integration', () => {
  it('creates an expo-image source with dimensions and cache metadata', () => {
    expect(
      createExpoImageSource(
        config,
        '/avatar.jpg',
        { height: 200, width: 200 },
        { cacheKey: 'avatar-1' },
      ),
    ).toMatchObject({ cacheKey: 'avatar-1', height: 200, width: 200 })
  })

  it('creates responsive web sources in ascending order', () => {
    const sources = createExpoImageSources(config, '/hero.jpg', [1200, 480], {
      aspectRatio: 1.5,
    })

    expect(sources.map((source) => source.width)).toEqual([480, 1200])
    expect(sources.map((source) => source.height)).toEqual([320, 800])
  })

  it('maps Keenpix fit to expo-image contentFit', () => {
    expect(
      createExpoImageProps(config, {
        alt: 'Avatar',
        fit: 'inside',
        src: '/avatar.jpg',
      }).contentFit,
    ).toBe('scale-down')
  })
})
