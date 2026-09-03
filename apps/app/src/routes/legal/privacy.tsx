import { createFileRoute } from '@tanstack/react-router'
import { LEGAL_PAGES } from '@/features/legal/legal-content'
import { LegalDocument } from '@/features/legal/legal-document'
import { absoluteUrl, seo } from '@/shared/seo'

const page = LEGAL_PAGES.privacy

export const Route = createFileRoute('/legal/privacy')({
  head: () => ({
    links: [{ rel: 'canonical', href: absoluteUrl('/legal/privacy') }],
    meta: seo({
      title: page.seoTitle,
      description: page.description,
      url: absoluteUrl('/legal/privacy'),
    }),
  }),
  component: PrivacyPage,
})

function PrivacyPage() {
  return <LegalDocument pageId="privacy" />
}
