import { describe, expect, it } from 'vitest'
import {
  acceptsHtml,
  homePageMarkdown,
  isDocumentPath,
  markdownResponse,
  negotiateDocumentRepresentation,
  notFoundMarkdown,
  varyByAccept,
  withMarkdownDiscovery,
} from './agent-negotiation'

describe('agent content negotiation', () => {
  it.each([
    [null, 'html'],
    ['*/*', 'html'],
    ['text/html', 'html'],
    ['text/markdown', 'markdown'],
    ['text/markdown, text/html;q=0.8', 'markdown'],
    ['text/html, text/markdown', 'html'],
    ['text/markdown;q=0, */*;q=1', 'html'],
    ['application/json', 'unacceptable'],
    ['text/html;q=0, text/markdown;q=0', 'unacceptable'],
  ])('negotiates %s as %s', (accept, expected) => {
    expect(negotiateDocumentRepresentation(accept)).toBe(expected)
  })

  it('recognizes HTML fallbacks without letting wildcards override exclusions', () => {
    expect(acceptsHtml('text/markdown, text/html;q=0.5')).toBe(true)
    expect(acceptsHtml('text/html;q=0, */*;q=1')).toBe(false)
  })

  it('limits document negotiation to public page-like paths', () => {
    expect(isDocumentPath('/')).toBe(true)
    expect(isDocumentPath('/missing-page')).toBe(true)
    expect(isDocumentPath('/api/health')).toBe(false)
    expect(isDocumentPath('/brand/logo.svg')).toBe(false)
  })

  it('publishes canonical recovery and developer links in Markdown', () => {
    const home = homePageMarkdown('https://keenpix.com')
    const missing = notFoundMarkdown('https://keenpix.com')

    expect(home).toContain('https://keenpix.com/openapi.json')
    expect(home).toContain('https://keenpix.com/developers')
    expect(home).toContain('mailto:hi@raedbahri.com')
    expect(home).toContain('https://wa.me/21626765990')
    expect(home).toContain('does not operate an OAuth authorization server')
    expect(home).toContain('separate API sandbox')
    expect(home).toContain('official CLI')
    expect(missing).toContain('https://keenpix.com/sitemap.xml')
    expect(missing).toContain('https://keenpix.com/llms.txt')
  })

  it('sets the registered Markdown type and varies by Accept', async () => {
    const response = markdownResponse('# Keenpix', 'GET', 200, '/pricing')

    expect(response.headers.get('content-type')).toBe(
      'text/markdown; charset=utf-8',
    )
    expect(response.headers.get('vary')).toBe('Accept')
    expect(response.headers.get('link')).toContain('</pricing.md>')
    expect(response.headers.get('link')).toContain('rel="describedby"')
    expect(await response.text()).toBe('# Keenpix')
  })

  it('advertises page Markdown and llms.txt on HTML responses', () => {
    const response = withMarkdownDiscovery(
      new Response('<html></html>', {
        headers: { link: '</feed>; rel="alternate"' },
      }),
      '/learn',
    )

    expect(response.headers.get('link')).toContain('</feed>')
    expect(response.headers.get('link')).toContain(
      '</learn.md>; rel="alternate"; type="text/markdown"',
    )
    expect(response.headers.get('link')).toContain(
      '</llms.txt>; rel="describedby"',
    )
    expect(response.headers.get('vary')).toBe('Accept')
  })

  it('merges Accept into existing Vary values without duplicates', () => {
    const response = varyByAccept(
      new Response('ok', { headers: { vary: 'Accept-Encoding' } }),
    )
    const secondPass = varyByAccept(response)

    expect(secondPass.headers.get('vary')).toBe('Accept, Accept-Encoding')
  })
})
