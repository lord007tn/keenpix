import { describe, expect, it } from 'vitest'
import { createNextImageProps, createNextLoader } from './index'

const config = { baseUrl: 'https://images.example.com', projectId: 'demo' }

describe('Next.js integration', () => {
  it('implements the Next.js custom loader contract', () => {
    const loader = createNextLoader(config)
    const url = loader({ quality: 75, src: '/hero.jpg', width: 828 })

    expect(url).toContain('w=828')
    expect(url).toContain('q=75')
    expect(url).toContain('project=demo')
  })

  it('keeps per-image transforms in the loader closure', () => {
    const props = createNextImageProps(config, {
      alt: 'Hero',
      fit: 'cover',
      height: 600,
      src: '/hero.jpg',
      width: 900,
    })

    const url = props.loader({ src: props.src, width: 600 })
    expect(url).toContain('fit=cover')
    expect(url).toContain('h=400')
    expect(props.src).toBe('/hero.jpg')
  })
})
