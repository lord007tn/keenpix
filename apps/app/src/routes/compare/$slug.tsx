import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { JsonLd } from '@/components/app/json-ld'
import { COMPARISONS } from '@/features/compare/comparison-data'
import { ComparisonPage } from '@/features/compare/comparison-page'
import { isCloud } from '@/server/deployment'
import { absoluteUrl, faqPageJsonLd, seo } from '@/shared/seo'

// The comparison content itself is a static module shared by server and
// client; the server fn only contributes what the client can't know — the
// deployment mode (self-host marketing pages are noindex, like /blog and
// /about) and the FAQPage JSON-LD gated on it. The Q&As are also rendered
// visibly on the page, which Google requires for FAQ rich results.
const compareMetaFn = createServerFn({ method: 'GET' })
  .inputValidator(z.string())
  .handler(({ data: slug }) => {
    const comparison = COMPARISONS[slug]
    if (!comparison) {
      throw notFound()
    }
    const selfHost = !isCloud()
    return {
      slug,
      selfHost,
      jsonLd: selfHost
        ? null
        : faqPageJsonLd(
            comparison.faq.map((item) => ({
              answer: item.a,
              question: item.q,
            })),
          ),
    }
  })

export const Route = createFileRoute('/compare/$slug')({
  loader: ({ params }) => {
    if (!COMPARISONS[params.slug]) {
      throw notFound()
    }
    return compareMetaFn({ data: params.slug })
  },
  head: ({ loaderData }) => {
    const comparison = loaderData ? COMPARISONS[loaderData.slug] : undefined
    if (!comparison) {
      return {}
    }
    const canonicalUrl = absoluteUrl(`/compare/${comparison.slug}`)
    return {
      links: [{ rel: 'canonical', href: canonicalUrl }],
      meta: [
        ...seo({
          title: comparison.title,
          description: comparison.metaDescription,
          url: canonicalUrl,
        }),
        ...(loaderData?.selfHost
          ? [{ name: 'robots', content: 'noindex,nofollow' }]
          : []),
      ],
    }
  },
  component: Compare,
})

function Compare() {
  const { slug, jsonLd } = Route.useLoaderData()
  const comparison = COMPARISONS[slug]
  if (!comparison) {
    return null
  }
  return (
    <>
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      <ComparisonPage comparison={comparison} />
    </>
  )
}
