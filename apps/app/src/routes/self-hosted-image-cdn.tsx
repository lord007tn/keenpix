import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { JsonLd } from '@/components/app/json-ld'
import { SelfHostedLandingPage } from '@/features/marketing/self-hosted-landing'
import { getRepositoryUrl, isCloud } from '@/server/deployment'
import {
  absoluteUrl,
  marketingPageJsonLd,
  seo,
  softwareApplicationJsonLd,
} from '@/shared/seo'

const SELF_HOSTED_DESCRIPTION =
  'Run an open-source, self-hosted image CDN with Sharp transforms, AVIF/WebP, analytics, signed URLs, and hardened origin controls behind your CDN.'

const selfHostedLandingMetaFn = createServerFn({ method: 'GET' }).handler(
  () => {
    const selfHost = !isCloud()
    const canonicalUrl = absoluteUrl('/self-hosted-image-cdn')
    return {
      jsonLd: selfHost
        ? null
        : [
            softwareApplicationJsonLd(),
            ...marketingPageJsonLd({
              description: SELF_HOSTED_DESCRIPTION,
              name: 'Self-hosted image CDN — open source under AGPL',
              path: [
                { name: 'Keenpix', url: absoluteUrl('/') },
                { name: 'Self-hosted image CDN', url: canonicalUrl },
              ],
              url: canonicalUrl,
            }),
          ],
      selfHost,
      repositoryUrl: getRepositoryUrl(),
    }
  },
)

export const Route = createFileRoute('/self-hosted-image-cdn')({
  loader: () => selfHostedLandingMetaFn(),
  head: ({ loaderData }) => {
    const canonicalUrl = absoluteUrl('/self-hosted-image-cdn')
    return {
      links: [{ rel: 'canonical', href: canonicalUrl }],
      meta: [
        ...seo({
          title: 'Self-hosted image CDN — open source under AGPL - Keenpix',
          description: SELF_HOSTED_DESCRIPTION,
          url: canonicalUrl,
        }),
        ...(loaderData?.selfHost
          ? [{ name: 'robots', content: 'noindex,nofollow' }]
          : []),
      ],
    }
  },
  component: SelfHostedImageCdn,
})

function SelfHostedImageCdn() {
  const { jsonLd, repositoryUrl } = Route.useLoaderData()
  return (
    <>
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      <SelfHostedLandingPage repositoryUrl={repositoryUrl} />
    </>
  )
}
