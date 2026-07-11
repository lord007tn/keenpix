import { createFileRoute } from '@tanstack/react-router'
import { TrustPage } from '@/features/marketing/trust-page'
import { absoluteUrl, seo } from '@/shared/seo'

export const Route = createFileRoute('/support')({
  head: () => ({
    links: [{ rel: 'canonical', href: absoluteUrl('/support') }],
    meta: seo({
      title: 'Keenpix support and corrections',
      description:
        'How to get Keenpix cloud help, report security or delivery issues, and request editorial corrections.',
      url: absoluteUrl('/support'),
    }),
  }),
  component: () => <TrustPage page="support" />,
})
