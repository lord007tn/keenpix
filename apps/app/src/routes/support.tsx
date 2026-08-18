import { createFileRoute } from '@tanstack/react-router'
import { TrustPage } from '@/features/marketing/trust-page'
import { absoluteUrl, seo } from '@/shared/seo'

export const Route = createFileRoute('/support')({
  head: () => ({
    links: [{ rel: 'canonical', href: absoluteUrl('/support') }],
    meta: seo({
      title: 'Keenpix support and corrections',
      description:
        'Get Keenpix cloud support, report image-delivery or security issues with useful diagnostics, and request corrections to technical or comparison content.',
      url: absoluteUrl('/support'),
    }),
  }),
  component: () => <TrustPage page="support" />,
})
