import { describe, expect, it } from 'vitest'
import { createNuxtImageProvider } from './index.js'

describe('createNuxtImageProvider', () => {
  it('implements the Nuxt Image provider getImage contract', () => {
    const provider = createNuxtImageProvider({
      baseURL: 'https://images.example.com',
      projectId: 'site',
    })

    expect(
      provider.getImage('/hero.jpg', {
        modifiers: { format: 'webp', height: 450, width: 800 },
      }),
    ).toEqual({
      url: 'https://images.example.com/img/hero.jpg?project=site&fmt=webp&h=450&w=800',
    })
  })

  it('requires a provider base URL', () => {
    expect(() => createNuxtImageProvider().getImage('/hero.jpg')).toThrow(
      'requires a baseURL',
    )
  })
})
