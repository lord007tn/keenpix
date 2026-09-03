import { describe, expect, it, vi } from 'vitest'
import { handleDocumentRequest } from './document-request'

const canonicalOrigin = 'https://keenpix.com'

describe('public document request dispatch', () => {
  it('leaves the RSS document status, media type, and discovery headers untouched', async () => {
    const loadMarkdown = vi.fn()
    const response = await handleDocumentRequest({
      canonicalOrigin,
      loadMarkdown,
      request: new Request('https://alias.example/blog/rss.xml', {
        headers: { Accept: 'application/rss+xml' },
      }),
      route: async () =>
        new Response('<rss version="2.0" />', {
          headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
          status: 200,
        }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe(
      'application/rss+xml; charset=utf-8',
    )
    expect(response.headers.get('link')).toBeNull()
    expect(response.headers.get('vary')).toBeNull()
    expect(loadMarkdown).not.toHaveBeenCalled()
  })

  it.each([
    ['https://alias.example/learn', 'text/markdown'],
    ['https://alias.example/learn.md', '*/*'],
  ])('uses the configured canonical origin for %s', async (url, accept) => {
    const loadMarkdown = vi.fn(async (pathname, origin) =>
      [
        '# Learn',
        `Canonical HTML: [${origin}${pathname}](${origin}${pathname})`,
      ].join('\n\n'),
    )
    const response = await handleDocumentRequest({
      canonicalOrigin,
      loadMarkdown,
      request: new Request(url, { headers: { Accept: accept } }),
      route: async () => new Response('html'),
    })
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe(
      'text/markdown; charset=utf-8',
    )
    expect(body).toContain('https://keenpix.com/learn')
    expect(body).not.toContain('https://alias.example')
    expect(loadMarkdown).toHaveBeenCalledWith('/learn', canonicalOrigin)
  })
})
