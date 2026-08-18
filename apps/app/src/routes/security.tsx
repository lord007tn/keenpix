import { createFileRoute } from '@tanstack/react-router'
import { TrustPage } from '@/features/marketing/trust-page'
import { absoluteUrl, seo } from '@/shared/seo'

export const Route = createFileRoute('/security')({
  head: () => ({
    links: [{ rel: 'canonical', href: absoluteUrl('/security') }],
    meta: seo({
      title: 'Keenpix security and data handling',
      description:
        'Review Keenpix security controls, origin allowlists, signed URLs, data handling, deployment boundaries, and the claims the image CDN does not make.',
      url: absoluteUrl('/security'),
    }),
  }),
  component: () => <TrustPage page="security" />,
})
