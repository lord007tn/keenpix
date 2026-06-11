import { createFileRoute } from '@tanstack/react-router'
import { MarketingPage } from '@/features/marketing/marketing-page'
import { SelfHostHome } from '@/features/marketing/self-host-home'
import { getPublicConfigFn } from '@/functions/config'
import {
  absoluteUrl,
  organizationJsonLd,
  SITE_DESCRIPTION,
  SITE_TITLE,
  seo,
  softwareApplicationJsonLd,
  webSiteJsonLd,
} from '@/shared/seo'

export const Route = createFileRoute('/')({
  loader: () => getPublicConfigFn(),
  head: ({ loaderData }) => {
    if (loaderData?.selfHost) {
      return {
        meta: [
          { title: 'Self-hosted Keenpix' },
          {
            name: 'description',
            content:
              'Private self-hosted Keenpix instance for managing image optimization projects, analytics, and pipeline settings.',
          },
          { name: 'robots', content: 'noindex,nofollow' },
        ],
      }
    }

    return {
      headScripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify([
            softwareApplicationJsonLd(),
            organizationJsonLd(),
            webSiteJsonLd(),
          ]),
        },
      ],
      links: [{ rel: 'canonical', href: absoluteUrl('/') }],
      meta: seo({
        title: SITE_TITLE,
        description: SITE_DESCRIPTION,
        url: absoluteUrl('/'),
      }),
    }
  },
  component: Home,
})

function Home() {
  const { selfHost } = Route.useLoaderData()
  return selfHost ? <SelfHostHome /> : <MarketingPage />
}
