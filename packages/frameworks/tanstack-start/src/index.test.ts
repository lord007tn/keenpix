import { describe, expect, it } from 'vitest'
import { createTanStackImage } from './index'

describe('createTanStackImage', () => {
  it('can run identically during SSR and hydration', () => {
    const image = createTanStackImage({ baseUrl: 'https://images.example.com' })
    const props = image({ alt: 'Hero', src: '/hero.jpg', width: 900 })

    expect(props.src).toContain('w=900')
    expect(props.alt).toBe('Hero')
  })
})
