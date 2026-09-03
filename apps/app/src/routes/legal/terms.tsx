import { createFileRoute } from '@tanstack/react-router'
import { LEGAL_PAGES } from '@/features/legal/legal-content'
import { LegalDocument } from '@/features/legal/legal-document'
import { absoluteUrl, seo } from '@/shared/seo'

const page = LEGAL_PAGES.terms

export const Route = createFileRoute('/legal/terms')({
  head: () => ({
    links: [{ rel: 'canonical', href: absoluteUrl('/legal/terms') }],
    meta: seo({
      title: page.seoTitle,
      description: page.description,
      url: absoluteUrl('/legal/terms'),
    }),
  }),
  component: TermsPage,
})

function TermsPage() {
  return <LegalDocument pageId="terms" />
}
