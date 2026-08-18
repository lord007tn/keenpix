import { createFileRoute } from '@tanstack/react-router'
import { TrustPage } from '@/features/marketing/trust-page'
import { absoluteUrl, seo } from '@/shared/seo'

export const Route = createFileRoute('/status')({
  head: () => ({
    links: [{ rel: 'canonical', href: absoluteUrl('/status') }],
    meta: seo({
      title: 'Keenpix Image CDN Service Status',
      description:
        'Check current Keenpix cloud health guidance, incident-reporting channels, operational dependencies, and the limits of point-in-time service checks.',
      url: absoluteUrl('/status'),
    }),
  }),
  component: () => <TrustPage page="status" />,
})
