import { createFileRoute } from '@tanstack/react-router'
import { TrustPage } from '@/features/marketing/trust-page'
import { absoluteUrl, seo } from '@/shared/seo'

export const Route = createFileRoute('/security')({
  head: () => ({
    links: [{ rel: 'canonical', href: absoluteUrl('/security') }],
    meta: seo({
      title: 'Keenpix security and data handling',
      description:
        'Keenpix security controls, data handling, deployment boundaries, and claims the product does not make.',
      url: absoluteUrl('/security'),
    }),
  }),
  component: () => <TrustPage page="security" />,
})
