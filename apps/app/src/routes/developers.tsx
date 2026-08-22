import { createFileRoute } from '@tanstack/react-router'
import { DeveloperResourcesPage } from '@/features/marketing/developer-resources-page'
import { absoluteUrl, seo } from '@/shared/seo'

export const Route = createFileRoute('/developers')({
  head: () => {
    const canonicalUrl = absoluteUrl('/developers')
    return {
      links: [{ rel: 'canonical', href: canonicalUrl }],
      meta: seo({
        title: 'Keenpix developer resources — API, OpenAPI and SDK',
        description:
          'Keenpix developer resources for the OpenAPI specification, authenticated SDK API, official Node SDK, API-key authentication, health endpoint, and agent-readable documentation.',
        url: canonicalUrl,
      }),
    }
  },
  component: DeveloperResourcesPage,
})
