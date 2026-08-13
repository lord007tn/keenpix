import { describe, expect, it } from 'vitest'

import keenpixEleventyPlugin from './index.js'

describe('Eleventy plugin', () => {
  it('registers a URL filter and image shortcode', () => {
    const filters = new Map<string, (...values: unknown[]) => unknown>()
    const shortcodes = new Map<string, (...values: unknown[]) => unknown>()

    keenpixEleventyPlugin(
      {
        addFilter(name, callback) {
          filters.set(name, callback)
        },
        addShortcode(name, callback) {
          shortcodes.set(name, callback)
        },
      },
      { config: { baseUrl: 'https://images.example.com' } },
    )

    expect(filters.get('keenpixUrl')?.('hero.jpg', { width: 640 })).toContain(
      'w=640',
    )
    expect(
      shortcodes.get('keenpixImage')?.('hero.jpg', 'Product hero', {
        widths: [320, 640],
      }),
    ).toContain('srcset=')
  })

  it('supports custom filter and shortcode names', () => {
    const names: string[] = []

    keenpixEleventyPlugin(
      {
        addFilter(name) {
          names.push(name)
        },
        addShortcode(name) {
          names.push(name)
        },
      },
      {
        config: { baseUrl: 'https://images.example.com' },
        imageShortcodeName: 'image',
        urlFilterName: 'imageUrl',
      },
    )

    expect(names).toEqual(['imageUrl', 'image'])
  })
})
