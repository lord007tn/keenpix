import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { LiveDemo } from './live-demo'

it('renders a usable default image and URL without JavaScript and no invented receipt', () => {
  const html = renderToStaticMarkup(createElement(LiveDemo))
  expect(html).toContain('id="demo"')
  expect(html).toContain('/demo/img/og.png?fmt=webp&amp;q=70&amp;w=960')
  expect(html).toContain('Open image')
  expect(html).toContain('aria-pressed="true"')
  expect(html).toContain('aria-live="polite"')
  expect(html).toContain('no account, allowlist, or billing')
  expect(html).not.toContain('% smaller')
})
