import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { JsonLd } from '@/components/app/json-ld'
import {
  SELF_HOSTED_FAQ,
  SelfHostedLandingPage,
} from '@/features/marketing/self-hosted-landing'
import { getRepositoryUrl, isCloud } from '@/server/deployment'
import { absoluteUrl, faqPageJsonLd, seo } from '@/shared/seo'

const selfHostedLandingMetaFn = createServerFn({ method: 'GET' }).handler(
  () => {
    const selfHost = !isCloud()
    // FAQPage structured data mirrors the visible FAQ section (cloud only);
    // self-host's marketing surface is noindex, so the node is suppressed there.
    return {
      selfHost,
      repositoryUrl: getRepositoryUrl(),
      jsonLd: selfHost ? null : faqPageJsonLd(SELF_HOSTED_FAQ),
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
          description:
            'Keenpix is an AGPL, self-hosted image CDN with a real dashboard — sharp transforms, AVIF/WebP, analytics, and SSRF-hardened allowlists. One Docker command, designed to sit behind your existing CDN.',
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
