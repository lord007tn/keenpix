import { describe, expect, it } from 'vitest'
import { createSvelteKeenpix } from './index.js'

describe('createSvelteKeenpix', () => {
  it('creates spreadable lowercase DOM attributes', () => {
    const keenpix = createSvelteKeenpix({ baseUrl: 'https://img.test' })

    expect(
      keenpix.imageProps({ alt: 'Logo', src: 'logo.png', widths: [320, 640] }),
    ).toMatchObject({
      alt: 'Logo',
      src: 'https://img.test/img/logo.png?w=640',
      srcset:
        'https://img.test/img/logo.png?w=320 320w, https://img.test/img/logo.png?w=640 640w',
    })
  })
})
