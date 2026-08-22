import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { JsonLd } from '@/components/app/json-ld'
import { CompareHub } from '@/features/compare/compare-hub'
import { COMPARISONS } from '@/features/compare/comparison-data'
import { isCloud } from '@/server/deployment'
import { absoluteUrl, comparisonListingJsonLd, seo } from '@/shared/seo'

// Same gating as /about: the page renders everywhere, but the self-host
// marketing surface is noindex so only the managed cloud ranks for it.
const compareHubMetaFn = createServerFn({ method: 'GET' }).handler(() => ({
  selfHost: !isCloud(),
  jsonLd: isCloud()
    ? comparisonListingJsonLd(
        Object.values(COMPARISONS).map((comparison) => ({
          name: `Keenpix vs ${comparison.competitor}`,
          url: absoluteUrl(`/compare/${comparison.slug}`),
        })),
      )
    : null,
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
            'Compare Keenpix with Cloudinary, imgix, imgproxy, ImageKit, Gumlet, Cloudflare, Bunny, and Vercel using dated pricing and best-fit guidance.',
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
  const { jsonLd } = Route.useLoaderData()
  return (
    <>
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      <CompareHub />
    </>
  )
}
