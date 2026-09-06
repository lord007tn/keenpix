import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Project } from '@/shared/types'
import { QuickStart } from './quick-start'

const project: Project = {
  id: 'synthetic-project',
  orgId: 'synthetic-org',
  name: 'Synthetic project',
  origin: 'https://assets.example.com',
  allowedOrigins: ['assets.example.com'],
  autoFormat: true,
  color1: '#000000',
  color2: '#ffffff',
  createdAt: '2026-01-01T00:00:00Z',
  defaultDpr: 1,
  defaultFit: 'cover',
  defaultQuality: 80,
  maxWidth: null,
  requireSignedUrls: false,
  signedUrlTtlSeconds: null,
  stripMetadata: true,
  watermarkEnabled: false,
  watermarkMargin: 0,
  watermarkOpacity: 100,
  watermarkPosition: 'center',
  watermarkScale: 10,
  watermarkUrl: null,
}

afterEach(() => vi.unstubAllGlobals())

describe('Quick Start integration URL', () => {
  it.each([
    'https://keenpix.com',
    'https://www.keenpix.com',
  ])('routes managed images through the delivery edge from %s', (origin) => {
    vi.stubGlobal('window', { location: { origin } })
    const html = renderToStaticMarkup(createElement(QuickStart, { project }))
    expect(html).toContain(
      'https://cdn.keenpix.com/p/synthetic-project/img/https%3A%2F%2Fassets.example.com%2Fyour-image.jpg?w=800&amp;fmt=webp',
    )
    expect(html).not.toContain('project=synthetic-project')
  })

  it('keeps self-hosted requests on the instance with a project query', () => {
    vi.stubGlobal('window', {
      location: { origin: 'https://images.example.com' },
    })
    const html = renderToStaticMarkup(createElement(QuickStart, { project }))
    expect(html).toContain(
      'https://images.example.com/img/https%3A%2F%2Fassets.example.com%2Fyour-image.jpg?project=synthetic-project&amp;w=800&amp;fmt=webp',
    )
  })
})
