import { createFileRoute } from '@tanstack/react-router'
import { TrustPage } from '@/features/marketing/trust-page'
import { absoluteUrl, seo } from '@/shared/seo'

export const Route = createFileRoute('/status')({
  head: () => ({
    links: [{ rel: 'canonical', href: absoluteUrl('/status') }],
    meta: seo({
      title: 'Keenpix cloud service status',
      description:
        'Current Keenpix cloud health guidance, incident reporting, and the limits of point-in-time health checks.',
      url: absoluteUrl('/status'),
    }),
  }),
  component: () => <TrustPage page="status" />,
})
