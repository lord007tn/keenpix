import { describe, expect, it } from 'vitest'
import { createRedwoodImage } from './index'

describe('createRedwoodImage', () => {
  it('returns serializable props for server components and prerendering', () => {
    const image = createRedwoodImage({ baseUrl: 'https://images.example.com' })
    const props = image({ alt: 'Hero', src: '/hero.jpg', widths: [480, 960] })

    expect(JSON.parse(JSON.stringify(props))).toEqual(props)
    expect(props.srcSet).toContain('960w')
  })
})
