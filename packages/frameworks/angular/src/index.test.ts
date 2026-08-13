import '@angular/compiler'

import { IMAGE_LOADER } from '@angular/common'
import { describe, expect, it } from 'vitest'

import { createAngularImageLoader, provideKeenpixImageLoader } from './index.js'

const config = {
  baseUrl: 'https://images.example.com',
  projectId: 'demo',
}

describe('Angular image loader', () => {
  it('maps NgOptimizedImage dimensions and loaderParams to Keenpix', () => {
    const loader = createAngularImageLoader(config)
    const url = loader({
      height: 450,
      loaderParams: { fit: 'cover', format: 'webp', quality: 82 },
      src: 'https://origin.example.com/hero.jpg',
      width: 800,
    })

    expect(url).toContain('w=800')
    expect(url).toContain('h=450')
    expect(url).toContain('fit=cover')
    expect(url).toContain('fmt=webp')
    expect(url).toContain('q=82')
  })

  it('creates a provider for the Angular IMAGE_LOADER token', () => {
    const provider = provideKeenpixImageLoader(config)

    expect(provider.provide).toBe(IMAGE_LOADER)
    expect(provider.useValue({ src: '/logo.png', width: 320 })).toContain(
      'w=320',
    )
  })
})
