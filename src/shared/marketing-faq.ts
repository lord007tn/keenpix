import { PLANS, STANDARD_PLAN_PRICES, TRIAL } from '@/lib/billing/plans'

// Single source of truth for the visible marketing-home FAQ. Written to answer
// high-intent questions ("Cloudinary alternative", "image CDN pricing") and to
// be citable by AI search engines without emitting ineligible FAQ rich-result
// markup for a non-government, non-health site.
// Every price/limit is derived from the plans catalog so this copy can never
// drift from what checkout actually charges.
const GB = 1024 ** 3

function gb(bytes: number): string {
  const value = bytes / GB
  return value >= 1000 ? `${value / 1000} TB` : `${value} GB`
}

const { pro, business } = PLANS

export const MARKETING_FAQ: Array<{ answer: string; question: string }> = [
  {
    question: 'How does Keenpix pricing work?',
    answer: `Keenpix bills on one thing — optimized bytes delivered through its managed cloud — and never per transform, request, or team member. Monthly plans are $${STANDARD_PLAN_PRICES.basic.priceMonthlyUsd}/$${STANDARD_PLAN_PRICES.pro.priceMonthlyUsd}/$${STANDARD_PLAN_PRICES.business.priceMonthlyUsd}. A Cloudflare edge hit, a Keenpix cache hit, and a new transform each count once when delivered. Browser or customer-owned CDN cache hits that never reach Keenpix are not counted. Prefer to pay nothing? Self-host the same open-source engine for free.`,
  },
  {
    question: 'Does delivery stop when I use my included managed delivery?',
    answer:
      'No. Paid plans stay online after the included managed delivery is used. Keenpix continues metering returned bytes, shows the estimated overage in billing, sends usage alerts, and Polar charges the accumulated overage at the end of the billing period. Trial allowances and abuse controls remain bounded, but normal paid usage does not pause image delivery.',
  },
  {
    question: 'How do custom domains work?',
    answer: `Custom-domain allowances belong to the organization and each hostname is assigned to one project. Basic uses the standard Keenpix hostname, Pro includes ${pro.customDomains} custom domain, and Business includes ${business.customDomains}. An active paid Business workspace can add one five-domain pack for $5/month, raising its organization limit to 15; the add-on can be managed separately in the billing portal.`,
  },
  {
    question: 'Does Keenpix replace my CDN?',
    answer:
      'No — Keenpix is the image-optimization layer, designed to sit behind the CDN you already run. Every transformed image is served with immutable, year-long cache headers, so Cloudflare, Fastly, CloudFront, or any edge cache in front of /img/* serves repeat requests straight from the edge. You keep your CDN, your domain, and your existing setup; Keenpix makes every image it delivers smaller.',
  },
  {
    question: 'How does Keenpix prevent abuse without API keys?',
    answer:
      'Every project has an origin allowlist: Keenpix only fetches from hosts you explicitly approve, so there is no API key to leak in your public image URLs and an empty allowlist fails closed. Fetching is SSRF-hardened — private and internal addresses are blocked, redirects are re-validated, and origin size and time are capped. For hotlink or cache-busting protection, enable HMAC-signed URLs per project and every request must carry a valid signature.',
  },
  {
    question: 'Is there a free trial?',
    answer: `Yes — every plan starts with a ${TRIAL.days}-day free trial. You get the plan's full features with up to ${TRIAL.maxProjects} projects and ${gb(TRIAL.bandwidthBytes)} delivered, and trial usage is never billed. Your card isn't charged until the trial ends, Polar emails you before the first charge, and you can cancel anytime from billing settings.`,
  },
  {
    question: 'Is Keenpix a Cloudinary, imgix, or ImageKit alternative?',
    answer:
      'Yes. Keenpix is a focused image-optimization alternative to Cloudinary, imgix, and ImageKit. It returns optimized images from your existing S3, R2, or origin with no per-transform credits, seat charges, or origin-image count. Managed billing counts optimized bytes delivered through the Keenpix-managed edge and application exactly once. Keenpix can also be self-hosted under AGPL-3.0, so teams that accept the operational responsibility can run the engine on their own infrastructure.',
  },
  {
    question: 'Do I have to migrate or re-upload my images?',
    answer:
      'No. Keenpix is a bring-your-own-origin proxy: point it at your existing S3, R2, or any origin and keep your URLs. There is no re-upload, no digital-asset-manager migration, and no lock-in.',
  },
  {
    question: 'Which image formats and transforms does Keenpix support?',
    answer:
      'AVIF, WebP, JPEG, PNG, GIF, HEIF, TIFF, and SVG, with sharp/IPX-style resize, crop, quality, and format controls. Transforms are unlimited on every plan and requested with a single URL — no SDK required. Projects can optionally require HMAC-signed URLs for hotlink protection.',
  },
  {
    question: 'Can I self-host Keenpix?',
    answer:
      'Yes. Keenpix is open-source (AGPL). Run the exact same transform and delivery engine on your own infrastructure with Docker, free and unlimited. The managed cloud is simply the hosted, supported version of the same engine.',
  },
  {
    question: 'How much smaller are images with Keenpix?',
    answer:
      'There is no honest universal savings percentage. The result depends on the source image, output dimensions, format, quality, and content. Keenpix can negotiate AVIF, WebP, or a compatible fallback from one URL, and resize, quality, and DPR controls help avoid sending unnecessary pixels. Project analytics report source and delivered bytes so you can measure the result on your own images before treating it as a performance or cost claim.',
  },
]
