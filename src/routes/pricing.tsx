import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { JsonLd } from '@/components/app/json-ld'
import { PRICING_FAQ, PricingPage } from '@/features/marketing/pricing-page'
import { getPlanPricingFn } from '@/functions/pricing'
import { isCloud } from '@/server/deployment'
import {
  absoluteUrl,
  faqPageJsonLd,
  PRICING_DESCRIPTION,
  pricingPageJsonLd,
  seo,
} from '@/shared/seo'

const pricingMetaFn = createServerFn({ method: 'GET' }).handler(() => {
  const selfHost = !isCloud()
  if (selfHost) {
    return { selfHost, jsonLd: null }
  }
  const jsonLd = [pricingPageJsonLd(), faqPageJsonLd(PRICING_FAQ)]
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
          description: PRICING_DESCRIPTION,
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
