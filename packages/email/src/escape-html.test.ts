import { describe, expect, it } from 'vitest'
import { escapeEmailHtml } from './escape-html'

describe('escapeEmailHtml', () => {
  it('escapes untrusted values used in transactional email markup', () => {
    expect(escapeEmailHtml(`<a href="x">Tom & Jerry's</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#039;s&lt;/a&gt;',
    )
  })
})
