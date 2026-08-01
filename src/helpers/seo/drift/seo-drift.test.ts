import { describe, expect, it } from 'vitest'
import {
  compareSeoSnapshots,
  parseSeoSnapshot,
} from '../../../../scripts/seo-drift.mjs'

const html = `<!doctype html>
<html><head>
  <title>Image optimization CDN | Keenpix</title>
  <meta name="description" content="Predictable image optimization.">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://keenpix.com/">
  <meta property="og:title" content="Keenpix">
  <meta property="og:description" content="Predictable image optimization.">
  <meta property="og:image" content="https://keenpix.com/og.png">
  <meta property="og:url" content="https://keenpix.com/">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage"}</script>
</head><body><h1>Optimized images</h1><h2>Pricing</h2></body></html>`

describe('SEO drift gate', () => {
  it('captures canonical, robots, headings, Open Graph, and schema', () => {
    const snapshot = parseSeoSnapshot(html, 'https://keenpix.com/')

    expect(snapshot.canonical).toBe('https://keenpix.com/')
    expect(snapshot.h1).toEqual(['Optimized images'])
    expect(snapshot.openGraph['og:image']).toBe('https://keenpix.com/og.png')
    expect(snapshot.schema).toHaveLength(1)
  })

  it('blocks canonical, noindex, and schema regressions', () => {
    const baseline = parseSeoSnapshot(html, 'https://keenpix.com/')
    const current = parseSeoSnapshot(
      html
        .replace('https://keenpix.com/">', 'https://www.keenpix.com/">')
        .replace('index,follow', 'noindex,nofollow')
        .replace('"WebPage"', '"Article"'),
      'https://keenpix.com/',
    )
    const result = compareSeoSnapshots(baseline, current)

    expect(result.passed).toBe(false)
    expect(result.critical).toHaveLength(3)
  })

  it('treats a raw HTML-only change as informational', () => {
    const baseline = parseSeoSnapshot(html, 'https://keenpix.com/')
    const current = parseSeoSnapshot(
      html.replace('</body>', '<!-- dynamic request id --></body>'),
      'https://keenpix.com/',
    )
    const result = compareSeoSnapshots(baseline, current)

    expect(result.passed).toBe(true)
    expect(result.critical).toEqual([])
    expect(result.warning).toEqual([])
    expect(result.info).toHaveLength(1)
  })
})
