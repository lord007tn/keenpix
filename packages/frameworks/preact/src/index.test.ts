import { describe, expect, it } from 'vitest'
import { createPreactImage } from './index'

describe('createPreactImage', () => {
  it('returns Preact-compatible DOM image props', () => {
    const image = createPreactImage({ baseUrl: 'https://images.example.com' })
    const props = image({
      alt: 'Avatar',
      src: '/avatar.jpg',
      width: 256,
      widths: [64, 128, 256],
    })

    expect(props.alt).toBe('Avatar')
    expect(props.srcSet).toContain('64w')
    expect(props.width).toBe(256)
  })
})
