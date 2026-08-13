import { describe, expect, it } from 'vitest'
import { createKeenpixImage, createVueImageProps } from './index.js'

describe('createVueImageProps', () => {
  it('returns Vue-compatible responsive image attributes', () => {
    expect(
      createVueImageProps(
        { baseUrl: 'https://images.example.com' },
        {
          alt: 'Portrait',
          src: 'portrait.jpg',
          width: 800,
          widths: [400, 800],
        },
      ),
    ).toMatchObject({
      alt: 'Portrait',
      src: 'https://images.example.com/img/portrait.jpg?w=800',
      srcset:
        'https://images.example.com/img/portrait.jpg?w=400 400w, https://images.example.com/img/portrait.jpg?w=800 800w',
      width: 800,
    })
  })

  it('creates a Vue component without leaking transform props', () => {
    const KeenpixImage = createKeenpixImage({ baseUrl: 'https://img.test' })
    const vnode = KeenpixImage({
      alt: 'Hero',
      class: 'hero',
      quality: 80,
      src: 'hero.jpg',
      width: 640,
    })

    expect(vnode.type).toBe('img')
    expect(vnode.props).toMatchObject({
      alt: 'Hero',
      class: 'hero',
      src: 'https://img.test/img/hero.jpg?q=80&w=640',
      width: 640,
    })
    expect(vnode.props).not.toHaveProperty('quality')
  })
})
