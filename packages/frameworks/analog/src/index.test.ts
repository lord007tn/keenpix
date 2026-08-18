import { describe, expect, it } from 'vitest'
import { createAnalogImageLoader, createAnalogImageProvider } from './index.js'

describe('Analog image integration', () => {
  it('creates an NgOptimizedImage-compatible provider', () => {
    const token = Symbol('IMAGE_LOADER')
    const config = { baseUrl: 'https://img.test' }
    const provider = createAnalogImageProvider(token, config)

    expect(provider.provide).toBe(token)
    expect(
      provider.useValue({
        height: 360,
        loaderParams: { format: 'webp', quality: 80 },
        src: 'hero.jpg',
        width: 640,
      }),
    ).toBe(
      createAnalogImageLoader(config)({
        height: 360,
        loaderParams: { format: 'webp', quality: 80 },
        src: 'hero.jpg',
        width: 640,
      }),
    )
  })
})
