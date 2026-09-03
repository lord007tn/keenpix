import { createFileRoute } from '@tanstack/react-router'
import { LEGAL_PAGES } from '@/features/legal/legal-content'
import { LegalDocument } from '@/features/legal/legal-document'
import { absoluteUrl, seo } from '@/shared/seo'

const page = LEGAL_PAGES.dpa

export const Route = createFileRoute('/legal/dpa')({
  head: () => ({
    links: [{ rel: 'canonical', href: absoluteUrl('/legal/dpa') }],
    meta: seo({
      title: page.seoTitle,
      description: page.description,
      url: absoluteUrl('/legal/dpa'),
    }),
  }),
  component: DpaPage,
})

function DpaPage() {
  return <LegalDocument pageId="dpa" />
}
