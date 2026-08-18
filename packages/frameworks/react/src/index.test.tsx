import { describe, expect, it } from 'vitest'
import { createKeenpixImage, KeenpixImage } from './index'

const config = {
  baseUrl: 'https://images.example.com',
  projectId: 'demo',
}

describe('KeenpixImage', () => {
  it('renders responsive native image attributes without leaking transforms', () => {
    const image = KeenpixImage({
      alt: 'A mountain',
      className: 'hero',
      config,
      quality: 80,
      src: 'https://origin.example.com/mountain.jpg',
      width: 1200,
      widths: [480, 960, 1200],
    })

    expect(image.props.alt).toBe('A mountain')
    expect(image.props.className).toBe('hero')
    expect(image.props.quality).toBeUndefined()
    expect(image.props.src).toContain('w=1200')
    expect(image.props.srcSet).toContain('480w')
  })

  it('creates a component with configuration captured once', () => {
    const Image = createKeenpixImage(config)
    const image = Image({ alt: 'Avatar', src: '/avatar.png', width: 96 })

    expect(image.props.config).toEqual(config)
    expect(image.props.width).toBe(96)
  })
})
