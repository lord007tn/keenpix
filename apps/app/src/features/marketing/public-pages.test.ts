// @vitest-environment jsdom

import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { catalogPricing } from '@/lib/billing/plans'
import { MARKETING_FAQ } from '@/shared/marketing-faq'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
    to,
  }: {
    children: string
    className: string
    to: string
  }) => createElement('a', { className, href: to }, children),
}))

vi.mock('@/components/theme/mode-toggle', () => ({ ModeToggle: () => null }))

import changelog from '../../../../../CHANGELOG.md?raw'
import { ChangelogPage } from './changelog-page'
import { MarketingPage } from './marketing-page'
import { PricingPage } from './pricing-page'

const pricing = catalogPricing('standard')
const trialLine =
  '14-day free trial · up to 2 projects and 20 GB delivered · card required'
const deliveryFootnote = 'Successful (2xx) managed-cloud image responses'

function renderMarketingPage(deliveredImages: number | null) {
  const html = renderToString(
    createElement(MarketingPage, { deliveredImages, pricing }),
  )
  return {
    html,
    document: new DOMParser().parseFromString(html, 'text/html'),
  }
}

function renderPricingPage() {
  return new DOMParser().parseFromString(
    renderToString(createElement(PricingPage, { pricing })),
    'text/html',
  )
}

describe('public FAQ server rendering', () => {
  it('ships every closed homepage answer in the server HTML', () => {
    const { document } = renderMarketingPage(null)
    const panels = [
      ...document.querySelectorAll('#faq [data-slot="accordion-content"]'),
    ]

    expect(panels).toHaveLength(MARKETING_FAQ.length)
    for (const [index, item] of MARKETING_FAQ.entries()) {
      expect(panels[index]?.textContent).toContain(item.answer)
      expect(panels[index]?.hasAttribute('hidden')).toBe(true)
    }
    expect(document.body.textContent).toContain(
      'There is no honest universal savings percentage',
    )
    expect(
      [
        ...document.querySelectorAll('#faq [data-slot="accordion-trigger"]'),
      ].map((trigger) => trigger.getAttribute('aria-expanded')),
    ).toEqual(MARKETING_FAQ.map(() => 'false'))
  })

  it('ships every closed pricing answer in the server HTML', () => {
    const document = renderPricingPage()
    const panels = [
      ...document.querySelectorAll('[data-slot="accordion-content"]'),
    ]

    expect(panels.length).toBeGreaterThan(0)
    for (const panel of panels) {
      expect(panel.hasAttribute('hidden')).toBe(true)
      expect(panel.textContent?.trim()).not.toBe('')
    }
    expect(document.body.textContent).toContain('dunning grace window')
  })
})

describe('plan card trial limits', () => {
  it('shows the catalog trial limits on all three homepage cards', () => {
    expect(renderMarketingPage(null).html.split(trialLine)).toHaveLength(4)
  })

  it('shows the catalog trial limits on all three pricing cards', () => {
    expect(renderPricingPage().body.innerHTML.split(trialLine)).toHaveLength(4)
  })
})

describe('homepage delivery metric', () => {
  it.each([
    null,
    0,
    999_999,
  ])('hides the metric and its footnote at %s', (deliveredImages) => {
    const { html } = renderMarketingPage(deliveredImages)

    expect(html).not.toContain('recorded successful image responses')
    expect(html).not.toContain(deliveryFootnote)
    expect(html).not.toContain('M+')
  })

  it.each([
    [1_000_000, '1M+'],
    [17_999_999, '17M+'],
  ])('floors %i to whole millions', (deliveredImages, label) => {
    const { html } = renderMarketingPage(deliveredImages)

    expect(html).toContain(label)
    expect(html).toContain('recorded successful image responses')
    expect(html).toContain(deliveryFootnote)
    expect(html).not.toContain('and counting')
  })
})

describe('changelog incident entry', () => {
  const document = new DOMParser().parseFromString(
    renderToString(createElement(ChangelogPage, { markdown: changelog })),
    'text/html',
  )
  const sections = [...document.querySelectorAll('main section')]

  it('renders as a dated incident note between the releases', () => {
    const [latestRelease, incident, previousRelease] = sections

    expect(latestRelease?.querySelector('h2')?.textContent).toBe('v0.3.3')
    expect(latestRelease?.querySelector('time')?.textContent).toBe('2026-10-30')
    expect(incident?.querySelector('h2')?.textContent).toBe(
      '2026-10-17 — Availability incident',
    )
    expect(incident?.querySelector('time')).toBeNull()
    expect(incident?.querySelectorAll('li')).toHaveLength(4)
    expect(incident?.querySelector('p')).toBeNull()
    expect(incident?.textContent).toContain(
      'origin TLS certificates had expired, and automatic renewal',
    )
    expect(previousRelease?.querySelector('h2')?.textContent).toBe('v0.3.2')
    expect(previousRelease?.querySelector('time')?.textContent).toBe(
      '2026-09-01',
    )
  })
})
