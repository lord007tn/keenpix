import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { SelfHostedLandingPage } from '@/features/marketing/self-hosted-landing'
import { getRepositoryUrl, isCloud } from '@/server/deployment'
import { absoluteUrl, seo } from '@/shared/seo'

const selfHostedLandingMetaFn = createServerFn({ method: 'GET' }).handler(
  () => {
    const selfHost = !isCloud()
    return {
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
          description:
            'Run an open-source, self-hosted image CDN with Sharp transforms, AVIF/WebP, analytics, signed URLs, and hardened origin controls behind your CDN.',
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
  const { repositoryUrl } = Route.useLoaderData()
  return <SelfHostedLandingPage repositoryUrl={repositoryUrl} />
}
