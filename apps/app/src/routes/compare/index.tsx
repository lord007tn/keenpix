import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { CompareHub } from '@/features/compare/compare-hub'
import { isCloud } from '@/server/deployment'
import { absoluteUrl, seo } from '@/shared/seo'

// Same gating as /about: the page renders everywhere, but the self-host
// marketing surface is noindex so only the managed cloud ranks for it.
const compareHubMetaFn = createServerFn({ method: 'GET' }).handler(() => ({
  selfHost: !isCloud(),
}))

export const Route = createFileRoute('/compare/')({
  loader: () => compareHubMetaFn(),
  head: ({ loaderData }) => {
    const canonicalUrl = absoluteUrl('/compare')
    return {
      links: [{ rel: 'canonical', href: canonicalUrl }],
      meta: [
        ...seo({
          title: 'How Keenpix compares — honest image CDN comparisons',
          description:
            'Compare Keenpix with Cloudinary, imgix, ImageKit, and Vercel Image Optimization using dated pricing, feature matrices, and best-fit guidance.',
          url: canonicalUrl,
        }),
        ...(loaderData?.selfHost
          ? [{ name: 'robots', content: 'noindex,nofollow' }]
          : []),
      ],
    }
  },
  component: CompareHubPage,
})

function CompareHubPage() {
  return <CompareHub />
}
