import { Fragment } from 'react'
import {
  LEGAL_PAGES,
  type LegalBlock,
  type LegalInline,
  type LegalPageId,
} from '@/features/legal/legal-content'
import { LegalLayout } from '@/features/legal/legal-layout'

function InlineContent({ content }: { content: LegalInline[] }) {
  return content.map((part) => {
    if (typeof part === 'string') {
      return <Fragment key={part}>{part}</Fragment>
    }
    if (part.kind === 'strong') {
      return <strong key={`strong-${part.text}`}>{part.text}</strong>
    }
    return (
      <a
        href={part.href}
        key={`link-${part.href}-${part.text}`}
        rel={part.external ? 'noopener noreferrer' : undefined}
        target={part.external ? '_blank' : undefined}
      >
        {part.text}
      </a>
    )
  })
}

function LegalBlockContent({ block }: { block: LegalBlock }) {
  if (block.kind === 'paragraph') {
    return (
      <p>
        <InlineContent content={block.content} />
      </p>
    )
  }
  return (
    <ul>
      {block.items.map((item) => (
        <li key={JSON.stringify(item)}>
          <InlineContent content={item} />
        </li>
      ))}
    </ul>
  )
}

export function LegalDocumentContent({ pageId }: { pageId: LegalPageId }) {
  const page = LEGAL_PAGES[pageId]
  return (
    <>
      {page.introduction.map((block) => (
        <LegalBlockContent
          block={block}
          key={`introduction-${JSON.stringify(block)}`}
        />
      ))}
      {page.sections.map((section) => (
        <Fragment key={section.title}>
          <h2>{section.title}</h2>
          {section.blocks.map((block) => (
            <LegalBlockContent
              block={block}
              key={`${section.title}-${JSON.stringify(block)}`}
            />
          ))}
        </Fragment>
      ))}
    </>
  )
}

export function LegalDocument({ pageId }: { pageId: LegalPageId }) {
  const page = LEGAL_PAGES[pageId]
  return (
    <LegalLayout lastUpdated={page.lastUpdated} title={page.title}>
      <LegalDocumentContent pageId={pageId} />
    </LegalLayout>
  )
}
