import { describe, expect, it } from 'vitest'
import {
  buildImageUrl,
  buildSrcSet,
  canonicalSignaturePayload,
  createImageAttributes,
} from './index'

const config = {
  baseUrl: 'https://keenpix.example.com/',
  projectId: 'project_1',
}

describe('buildImageUrl', () => {
  it('builds the self-hosted path form', () => {
    expect(
      buildImageUrl(config, 'https://cdn.example.com/hero.jpg', {
        format: 'webp',
        quality: 75,
        width: 1200,
      }),
    ).toBe(
      'https://keenpix.example.com/img/https://cdn.example.com/hero.jpg?project=project_1&fmt=webp&q=75&w=1200',
    )
  })

  it('builds managed project paths without a project query', () => {
    expect(
      buildImageUrl(
        {
          baseUrl: 'https://cdn.keenpix.com',
          projectId: 'project_1',
          projectInPath: true,
        },
        'https://cdn.example.com/hero.jpg',
        { width: 640 },
      ),
    ).toBe(
      'https://cdn.keenpix.com/p/project_1/img/https://cdn.example.com/hero.jpg?w=640',
    )
  })

  it('normalizes a leading source slash in path mode', () => {
    expect(buildImageUrl(config, '/uploads/hero.jpg')).toBe(
      'https://keenpix.example.com/img/uploads/hero.jpg?project=project_1',
    )
  })

  it('emits automatic Client Hint transform modes for every adapter', () => {
    expect(
      buildImageUrl(config, 'https://cdn.example.com/hero.jpg', {
        dpr: 'auto',
        width: 'auto',
      }),
    ).toContain('dpr=auto&w=auto')
  })
})

it('builds sorted, unique width candidates', () => {
  expect(
    buildSrcSet(config, 'https://cdn.example.com/a.jpg', [1280, 640, 640]),
  ).toBe(
    'https://keenpix.example.com/img/https://cdn.example.com/a.jpg?project=project_1&w=640 640w, https://keenpix.example.com/img/https://cdn.example.com/a.jpg?project=project_1&w=1280 1280w',
  )
})

it('preserves the display aspect ratio across responsive candidates', () => {
  expect(
    createImageAttributes(config, {
      alt: 'Hero',
      height: 600,
      src: 'https://cdn.example.com/a.jpg',
      width: 1200,
      widths: [400, 800],
    }).srcSet,
  ).toBe(
    'https://keenpix.example.com/img/https://cdn.example.com/a.jpg?project=project_1&h=200&w=400 400w, https://keenpix.example.com/img/https://cdn.example.com/a.jpg?project=project_1&h=400&w=800 800w',
  )
})

it('canonicalizes signature parameters independently of insertion order', () => {
  const params = new URLSearchParams('w=800&project=p1&sig=ignored&q=75')
  expect(
    canonicalSignaturePayload('https://cdn.example.com/a.jpg', params),
  ).toBe('https://cdn.example.com/a.jpg\nproject=p1&q=75&w=800')
})
