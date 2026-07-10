import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { JsonLd } from '@/components/app/json-ld'
import { PRICING_FAQ, PricingPage } from '@/features/marketing/pricing-page'
import { getPlanPricingFn } from '@/functions/pricing'
import { PLANS } from '@/lib/billing/plans'
import { isCloud } from '@/server/deployment'
import { absoluteUrl, seo } from '@/shared/seo'

const pricingMetaFn = createServerFn({ method: 'GET' }).handler(() => {
  const selfHost = !isCloud()
  if (selfHost) {
    return { selfHost, jsonLd: null }
  }
  // Per-plan Offers + the billing FAQ as structured data, so "keenpix pricing"
  // queries can surface prices and answers as rich results.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        name: 'Keenpix managed cloud',
        description:
          'Image optimization and delivery billed on one meter — bandwidth delivered — with unlimited transforms and a hard spending cap on by default.',
        brand: { '@type': 'Brand', name: 'Keenpix' },
        offers: Object.values(PLANS).map((plan) => ({
          '@type': 'Offer',
          name: `${plan.name} (monthly)`,
          price: String(plan.priceMonthlyUsd),
          priceCurrency: 'USD',
          url: absoluteUrl('/pricing'),
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: PRICING_FAQ.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ],
  }
  return { selfHost, jsonLd }
})

export const Route = createFileRoute('/pricing')({
  loader: async () => {
    const meta = await pricingMetaFn()
    const pricing = meta.selfHost ? null : await getPlanPricingFn()
    return { ...meta, pricing }
  },
  head: ({ loaderData }) => {
    const canonicalUrl = absoluteUrl('/pricing')
    return {
      links: [{ rel: 'canonical', href: canonicalUrl }],
      meta: [
        ...seo({
          title: 'Pricing — one honest meter, hard-capped - Keenpix',
          description:
            'Keenpix pricing: $9, $19, or $29/mo on bandwidth delivered with unlimited transforms, a 14-day free trial, and a default-on spending cap. Or self-host free (AGPL).',
          url: canonicalUrl,
        }),
        ...(loaderData?.selfHost
          ? [{ name: 'robots', content: 'noindex,nofollow' }]
          : []),
      ],
    }
  },
  component: Pricing,
})

function Pricing() {
  const { jsonLd, pricing } = Route.useLoaderData()
  return (
    <>
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      <PricingPage pricing={pricing} />
    </>
  )
}
