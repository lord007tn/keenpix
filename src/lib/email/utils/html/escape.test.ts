import { describe, expect, it } from 'vitest'
import { escapeEmailHtml } from './escape'

describe('escapeEmailHtml', () => {
  it('escapes text and attribute delimiters used in transactional emails', () => {
    expect(escapeEmailHtml(`A&B <team> "quoted" 'single'`)).toBe(
      'A&amp;B &lt;team&gt; &quot;quoted&quot; &#39;single&#39;',
    )
  })
})
