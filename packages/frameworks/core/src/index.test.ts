import { describe, expect, it } from 'vitest'
import { buildImageUrl, buildSrcSet, canonicalSignaturePayload } from './index'

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
})

it('builds sorted, unique width candidates', () => {
  expect(
    buildSrcSet(config, 'https://cdn.example.com/a.jpg', [1280, 640, 640]),
  ).toBe(
    'https://keenpix.example.com/img/https://cdn.example.com/a.jpg?project=project_1&w=640 640w, https://keenpix.example.com/img/https://cdn.example.com/a.jpg?project=project_1&w=1280 1280w',
  )
})

it('canonicalizes signature parameters independently of insertion order', () => {
  const params = new URLSearchParams('w=800&project=p1&sig=ignored&q=75')
  expect(
    canonicalSignaturePayload('https://cdn.example.com/a.jpg', params),
  ).toBe('https://cdn.example.com/a.jpg\nproject=p1&q=75&w=800')
})
