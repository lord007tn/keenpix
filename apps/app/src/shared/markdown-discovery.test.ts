import { describe, expect, it } from 'vitest'
import {
  getCanonicalPathname,
  getMarkdownPathname,
  isPublicKnowledgePath,
} from './markdown-discovery'

describe('Markdown discovery paths', () => {
  it.each([
    ['/', '/index.md'],
    ['/pricing', '/pricing.md'],
    ['/docs/reference/endpoint', '/docs/reference/endpoint.md'],
    ['/blog/what-is-an-image-cdn', '/blog/what-is-an-image-cdn.md'],
  ])('maps %s to %s', (canonical, markdown) => {
    expect(getMarkdownPathname(canonical)).toBe(markdown)
    expect(getCanonicalPathname(markdown)).toBe(canonical)
  })

  it('includes public knowledge while excluding private and API routes', () => {
    expect(isPublicKnowledgePath('/learn')).toBe(true)
    expect(isPublicKnowledgePath('/docs/reference/endpoint')).toBe(true)
    expect(isPublicKnowledgePath('/compare/cloudinary')).toBe(true)
    expect(isPublicKnowledgePath('/blog/rss.xml')).toBe(false)
    expect(isPublicKnowledgePath('/app/dashboard')).toBe(false)
    expect(isPublicKnowledgePath('/api/sdk/v1/projects')).toBe(false)
    expect(isPublicKnowledgePath('/login')).toBe(false)
  })
})
