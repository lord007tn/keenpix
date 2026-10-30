// @vitest-environment jsdom

import { createHash } from 'node:crypto'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { LegalBlock } from './legal-content'
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_PAGE_IDS,
  LEGAL_PAGES,
  legalPageMarkdown,
} from './legal-content'
import { LegalDocumentContent } from './legal-document'

const canonicalOrigin = 'https://keenpix.com'

// SHA-256 of each rendered legal document and its Markdown alternate. Legal text
// must not move as a side effect of other work: update these only as part of a
// deliberate legal change.
const LEGAL_SNAPSHOTS = {
  dpa: {
    html: '8f82dc1683312d60323fe947aeb431736b5777d5d48c1f4eee8ac03789586b04',
    markdown:
      'e260e42967a2907421e9c6fd00f1a41cbddf7aeb8ef9b5e2ac809e3875f77145',
  },
  license: {
    html: 'c45bae976d2d2f8e9e80f45b7e9e2e45cc3b3171796f1cfcf05c7c655a0b7732',
    markdown:
      '833557c9069cbe552fe2d57fc9adbdf3b4b59de793a92d563d8d392a04a290ef',
  },
  privacy: {
    html: 'e57795f44570ced9176c842b6103c2ff1e8e47907e5a9e9f98f45747697e2501',
    markdown:
      'a17ab1559220d55d12c8023f3f74e7677f5327ec3612b1bd2e3893e7d5d1f434',
  },
  terms: {
    html: 'e36437184c5fe7fcb6f53a85136b76fe8224f8b368dac0729056f06668b4a1e3',
    markdown:
      'bf2162d313a5d4eea4cc501cd2a436e27bc7e8538e32a49e7979935f7ea623f2',
  },
}

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

describe('published legal text', () => {
  it('keeps the legal contact separate from the public support address', () => {
    expect(LEGAL_CONTACT_EMAIL).toBe('hi@raedbahri.com')
  })

  it.each(
    LEGAL_PAGE_IDS,
  )('keeps the %s HTML and Markdown byte-identical', (pageId) => {
    const html = renderToStaticMarkup(
      createElement(LegalDocumentContent, { pageId }),
    )
    const markdown = legalPageMarkdown(pageId, canonicalOrigin)

    expect(createHash('sha256').update(html).digest('hex')).toBe(
      LEGAL_SNAPSHOTS[pageId].html,
    )
    expect(createHash('sha256').update(markdown).digest('hex')).toBe(
      LEGAL_SNAPSHOTS[pageId].markdown,
    )
  })
})

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
