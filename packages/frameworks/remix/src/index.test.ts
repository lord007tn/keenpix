import { describe, expect, it } from 'vitest'
import { createRemixImage } from './index'

describe('createRemixImage', () => {
  it('creates SSR-safe responsive img props', () => {
    const image = createRemixImage({ baseUrl: 'https://images.example.com' })
    const props = image({ alt: 'Hero', src: '/hero.jpg', widths: [400, 800] })

    expect(props.srcSet).toContain('400w')
    expect(props.alt).toBe('Hero')
  })
})
