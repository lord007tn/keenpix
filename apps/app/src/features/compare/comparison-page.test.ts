// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { ComparisonFaq } from './comparison-page'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const faq = [
  {
    q: 'How does the comparison work?',
    a: 'It uses dated vendor sources and states the important trade-offs.',
  },
  {
    q: 'Can I use the keyboard?',
    a: 'Each question uses the shared accessible accordion control.',
  },
]

describe('comparison FAQ', () => {
  it('renders each question as a collapsed button and reveals its answer', () => {
    const container = document.createElement('div')
    const root = createRoot(container)
    document.body.append(container)

    act(() => {
      root.render(createElement(ComparisonFaq, { faq }))
    })

    const triggers = container.querySelectorAll('button')
    expect(triggers).toHaveLength(2)
    expect(triggers[0].getAttribute('aria-expanded')).toBe('false')
    expect(triggers[0].textContent).toContain(faq[0].q)

    act(() => {
      triggers[0].click()
    })

    expect(triggers[0].getAttribute('aria-expanded')).toBe('true')
    expect(container.textContent).toContain(faq[0].a)

    act(() => {
      root.unmount()
    })
    container.remove()
  })
})
