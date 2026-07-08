import { createFileRoute } from '@tanstack/react-router'
import { JsonLd } from '@/components/app/json-ld'
import { MarketingPage } from '@/features/marketing/marketing-page'
import { SelfHostHome } from '@/features/marketing/self-host-home'
import { getPublicConfigFn } from '@/functions/config'
import { absoluteUrl, SITE_DESCRIPTION, SITE_TITLE, seo } from '@/shared/seo'

export const Route = createFileRoute('/')({
  loader: () => getPublicConfigFn(),
  head: ({ loaderData }) => {
    if (!loaderData?.cloud) {
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
  const { cloud, jsonLd } = Route.useLoaderData()
  if (!cloud) {
    return <SelfHostHome />
  }
  return (
    <>
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      <MarketingPage />
    </>
  )
}
