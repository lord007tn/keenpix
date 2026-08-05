import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { JsonLd } from '@/components/app/json-ld'
import { AboutPage } from '@/features/marketing/about-page'
import { isCloud } from '@/server/deployment'
import { absoluteUrl, organizationJsonLd, seo } from '@/shared/seo'

const aboutMetaFn = createServerFn({ method: 'GET' }).handler(() => {
  const selfHost = !isCloud()
  // Reinforce the Organization entity on the About page (cloud only); self-host's
  // marketing surface is noindex, so the node is suppressed there.
  return { selfHost, jsonLd: selfHost ? null : organizationJsonLd() }
})

export const Route = createFileRoute('/about')({
  loader: () => aboutMetaFn(),
  head: ({ loaderData }) => {
    const canonicalUrl = absoluteUrl('/about')
    return {
      links: [{ rel: 'canonical', href: canonicalUrl }],
      meta: [
        ...seo({
          title: 'About Keenpix — the honest image CDN',
          description:
            'Keenpix is an image optimization CDN with transparent managed-delivery pricing and an open-source, self-hostable engine. Meet the team and the principles behind it.',
          url: canonicalUrl,
        }),
        ...(loaderData?.selfHost
          ? [{ name: 'robots', content: 'noindex,nofollow' }]
          : []),
      ],
    }
  },
  component: About,
})

function About() {
  const { jsonLd } = Route.useLoaderData()
  return (
    <>
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      <AboutPage />
    </>
  )
}
