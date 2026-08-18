import { describe, expect, it } from 'vitest'

import { createHtmlImageAttributes, renderKeenpixImage } from './index.js'

const config = { baseUrl: 'https://images.example.com' }

describe('HTML image helpers', () => {
  it('creates browser-native image attributes', () => {
    expect(
      createHtmlImageAttributes(config, {
        alt: 'A hero',
        loading: 'lazy',
        sizes: '100vw',
        src: 'https://origin.example.com/hero.jpg',
        width: 800,
        widths: [400, 800],
      }),
    ).toMatchObject({
      alt: 'A hero',
      loading: 'lazy',
      sizes: '100vw',
      width: 800,
    })
  })

  it('escapes values when rendering an HTML string', () => {
    const html = renderKeenpixImage(config, {
      alt: 'A "hero" <image>',
      className: 'hero&wide',
      src: 'https://origin.example.com/hero.jpg',
      width: 800,
    })

    expect(html).toContain('alt="A &quot;hero&quot; &lt;image&gt;"')
    expect(html).toContain('class="hero&amp;wide"')
    expect(html).toContain('w=800')
  })
})
