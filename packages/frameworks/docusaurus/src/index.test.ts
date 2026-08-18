import { describe, expect, it } from 'vitest'
import { createDocusaurusImage } from './index'

describe('createDocusaurusImage', () => {
  it('creates props that can be spread onto an MDX img element', () => {
    const image = createDocusaurusImage({
      baseUrl: 'https://images.example.com',
    })
    const props = image({ alt: 'Diagram', src: '/diagram.png', width: 800 })

    expect(props.alt).toBe('Diagram')
    expect(props.src).toContain('w=800')
  })
})
