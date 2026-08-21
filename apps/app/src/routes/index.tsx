import { createFileRoute } from '@tanstack/react-router'
import { JsonLd } from '@/components/app/json-ld'
import { MarketingPage } from '@/features/marketing/marketing-page'
import { SelfHostHome } from '@/features/marketing/self-host-home'
import { getPublicConfigFn } from '@/functions/config'
import { getPlanPricingFn } from '@/functions/pricing'
import { getPublicStatsFn } from '@/functions/public-stats'
import { absoluteUrl, SITE_DESCRIPTION, SITE_TITLE, seo } from '@/shared/seo'

export const Route = createFileRoute('/')({
  loader: async () => {
    const config = await getPublicConfigFn()
    // Marketing (and its live pricing) is cloud-only; skip the Polar-backed
    // pricing call entirely in self-host.
    const [pricing, publicStats] = config.cloud
      ? await Promise.all([
          getPlanPricingFn(),
          getPublicStatsFn().catch(() => null),
        ])
      : [null, null]
    return { config, pricing, publicStats }
  },
  head: ({ loaderData }) => {
    if (!loaderData?.config.cloud) {
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
      links: [
        { rel: 'canonical', href: absoluteUrl('/') },
        // Cloud-only discovery links, kept off __root so self-host (where these
        // routes 404) never advertises them.
        { rel: 'alternate', type: 'text/plain', href: '/llms.txt' },
        {
          rel: 'alternate',
          type: 'application/rss+xml',
          href: '/blog/rss.xml',
          title: 'Keenpix Blog',
        },
      ],
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
  const { config, pricing, publicStats } = Route.useLoaderData()
  if (!config.cloud) {
    return <SelfHostHome />
  }
  return (
    <>
      {config.jsonLd ? <JsonLd data={config.jsonLd} /> : null}
      <MarketingPage
        deliveredImages={publicStats?.deliveredImages ?? null}
        pricing={pricing}
      />
    </>
  )
}
