import { createFileRoute } from '@tanstack/react-router'
import { LEGAL_PAGES } from '@/features/legal/legal-content'
import { LegalDocument } from '@/features/legal/legal-document'
import { absoluteUrl, seo } from '@/shared/seo'

const page = LEGAL_PAGES.license

export const Route = createFileRoute('/legal/license')({
  head: () => ({
    links: [{ rel: 'canonical', href: absoluteUrl('/legal/license') }],
    meta: seo({
      title: page.seoTitle,
      description: page.description,
      url: absoluteUrl('/legal/license'),
    }),
  }),
  component: LicensePage,
})

function LicensePage() {
  return <LegalDocument pageId="license" />
}
