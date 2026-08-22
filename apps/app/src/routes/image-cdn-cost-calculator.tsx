import { createFileRoute } from '@tanstack/react-router'
import { JsonLd } from '@/components/app/json-ld'
import { ImageCdnCostCalculatorPage } from '@/features/marketing/image-cdn-cost-calculator-page'
import type { ImageCdnCostInputs } from '@/helpers/pricing/image-cdn-cost-calculator/calculate-image-cdn-cost'
import { absoluteUrl, imageCdnCalculatorJsonLd, seo } from '@/shared/seo'

const number = (value: unknown, fallback: number, minimum = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(minimum, parsed) : fallback
}

const optionalNumber = (value: unknown, minimum = 0) =>
  value === undefined ? undefined : number(value, minimum, minimum)

export const Route = createFileRoute('/image-cdn-cost-calculator')({
  validateSearch: (
    search: Record<string, unknown>,
  ): Partial<ImageCdnCostInputs> => {
    const region = search.region
    return {
      customDomains: optionalNumber(search.customDomains),
      deliveredGb: optionalNumber(search.deliveredGb),
      projects: optionalNumber(search.projects, 1),
      region:
        region === 'eu-na' ||
        region === 'asia' ||
        region === 'south-america' ||
        region === 'mea'
          ? region
          : undefined,
      requests: optionalNumber(search.requests),
      sourceStorageGb: optionalNumber(search.sourceStorageGb),
      uniqueTransforms: optionalNumber(search.uniqueTransforms),
    }
  },
  head: () => {
    const canonicalUrl = absoluteUrl('/image-cdn-cost-calculator')
    return {
      links: [{ rel: 'canonical', href: canonicalUrl }],
      meta: seo({
        title: 'Image CDN Cost Calculator: Compare 10 Providers | Keenpix',
        description:
          'Compare source-dated image CDN cost estimates for Keenpix, Cloudinary, imgix, ImageKit, Gumlet, TwicPics, Cloudflare, Bunny, Vercel, and imgproxy.',
        url: canonicalUrl,
      }),
    }
  },
  component: ImageCdnCostCalculator,
})

function ImageCdnCostCalculator() {
  const search = Route.useSearch()
  const inputs = {
    customDomains: search.customDomains ?? 0,
    deliveredGb: search.deliveredGb ?? 100,
    projects: search.projects ?? 1,
    region: search.region ?? 'eu-na',
    requests: search.requests ?? 100_000,
    sourceStorageGb: search.sourceStorageGb ?? 10,
    uniqueTransforms: search.uniqueTransforms ?? 5000,
  } satisfies ImageCdnCostInputs
  return (
    <>
      <JsonLd data={imageCdnCalculatorJsonLd()} />
      <ImageCdnCostCalculatorPage initialInputs={inputs} />
    </>
  )
}
