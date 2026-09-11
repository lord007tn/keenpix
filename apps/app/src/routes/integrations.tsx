import { createFileRoute } from '@tanstack/react-router'
import { IntegrationsPage } from '@/features/marketing/integrations-page'
import { absoluteUrl, seo } from '@/shared/seo'

export const Route = createFileRoute('/integrations')({
  head: () => {
    const url = absoluteUrl('/integrations')
    return {
      links: [{ rel: 'canonical', href: url }],
      meta: seo({
        title: 'Keenpix integrations — frameworks, image origins and SDK',
        description:
          'Choose a Next.js loader, React or Vue adapter, HTTP image origin, or server SDK. Understand setup, package-free delivery, security boundaries and trade-offs.',
        url,
      }),
    }
  },
  component: IntegrationsPage,
})
