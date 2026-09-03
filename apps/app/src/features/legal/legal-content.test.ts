// @vitest-environment jsdom

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { LegalBlock } from './legal-content'
import { LEGAL_PAGE_IDS, LEGAL_PAGES, legalPageMarkdown } from './legal-content'
import { LegalDocumentContent } from './legal-document'

const canonicalOrigin = 'https://keenpix.com'

function expectBlockParity(
  block: LegalBlock,
  htmlDocument: Document,
  htmlText: string,
  markdown: string,
  markdownText: string,
) {
  const items = block.kind === 'paragraph' ? [block.content] : block.items
  for (const item of items) {
    const text = item
      .map((part) => (typeof part === 'string' ? part : part.text))
      .join('')
    expect(htmlText).toContain(text)
    expect(markdownText).toContain(text)

    for (const part of item) {
      if (typeof part !== 'string' && part.kind === 'link') {
        expect(
          [...htmlDocument.querySelectorAll('a')].some(
            (link) =>
              link.getAttribute('href') === part.href &&
              link.textContent === part.text,
          ),
        ).toBe(true)
        expect(markdown).toContain(`[${part.text}](${part.href})`)
      }
      if (typeof part !== 'string' && part.kind === 'strong') {
        expect(markdown).toContain(`**${part.text}**`)
      }
    }
  }
}

describe('legal HTML and Markdown parity', () => {
  it.each(
    LEGAL_PAGE_IDS,
  )('renders every %s heading, block, and inline link from the shared source', (pageId) => {
    const page = LEGAL_PAGES[pageId]
    const html = renderToStaticMarkup(
      createElement(LegalDocumentContent, { pageId }),
    )
    const htmlDocument = new DOMParser().parseFromString(html, 'text/html')
    const htmlText = htmlDocument.body.textContent ?? ''
    const markdown = legalPageMarkdown(pageId, canonicalOrigin)
    const markdownText = markdown
      .replaceAll('**', '')
      .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')

    expect(markdown).toContain(`# ${page.title}`)
    expect(markdown).toContain(`Last updated: ${page.lastUpdated}`)
    expect(markdown).toContain(
      `Canonical HTML: [${canonicalOrigin}/legal/${pageId}](${canonicalOrigin}/legal/${pageId})`,
    )

    for (const section of page.sections) {
      expect(htmlText).toContain(section.title)
      expect(markdown).toContain(`## ${section.title}`)
    }

    for (const block of page.introduction) {
      expectBlockParity(block, htmlDocument, htmlText, markdown, markdownText)
    }
    for (const section of page.sections) {
      for (const block of section.blocks) {
        expectBlockParity(block, htmlDocument, htmlText, markdown, markdownText)
      }
    }
  })

  it.each([
    ['terms', 'authorized to bind that organization'],
    ['terms', 'Fees are non-refundable except where required by law'],
    ['terms', "Keenpix's aggregate liability"],
    [
      'privacy',
      'Cloudflare’s separate cookie-free Web Analytics beacon remains active',
    ],
    ['dpa', 'reasonable notice of new sub-processors'],
    ['dpa', 'without undue delay after becoming aware'],
  ] as const)('keeps the reviewed %s clause in both representations', (pageId, clause) => {
    const html = renderToStaticMarkup(
      createElement(LegalDocumentContent, { pageId }),
    )

    expect(
      new DOMParser().parseFromString(html, 'text/html').body.textContent,
    ).toContain(clause)
    expect(legalPageMarkdown(pageId, canonicalOrigin)).toContain(clause)
  })
})
