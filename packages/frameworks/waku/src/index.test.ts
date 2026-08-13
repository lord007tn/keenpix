import { describe, expect, it } from 'vitest'
import { createWakuImage } from './index'

describe('createWakuImage', () => {
  it('does not depend on client-only state', () => {
    const image = createWakuImage({ baseUrl: 'https://images.example.com' })

    expect(image({ alt: 'Logo', src: '/logo.png', width: 320 })).toMatchObject({
      alt: 'Logo',
      width: 320,
    })
  })
})
