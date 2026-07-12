import type { ComparisonPageData } from '../comparison-data'

export const cloudflareImagesComparison = {
  slug: 'cloudflare-images-alternative',
  competitor: 'Cloudflare Images',
  title: 'Cloudflare Images Alternative: Keenpix vs Cloudflare (2026)',
  metaDescription:
    'Keenpix vs Cloudflare Images: bandwidth pricing versus unique-transform pricing, storage choices, limits, migration steps, and when each wins.',
  heroHeadline: 'Keenpix vs Cloudflare Images: a bandwidth-priced alternative',
  heroSubhead:
    'Cloudflare Images is deeply integrated with the Cloudflare edge and meters unique transformations or hosted-image storage and delivery. Keenpix sits behind the CDN you choose and meters optimized response bytes returned by the application; upstream CDN edge hits do not reach that meter.',
  verdict:
    'Choose Cloudflare Images when you want Cloudflare-native storage, custom-domain delivery, Workers integration, or a free allowance for up to 5,000 unique remote-image transformations each month. Choose Keenpix when your originals already live elsewhere and application response bytes are the clearest planning unit. These meters are not interchangeable: Cloudflare can be less expensive for repeated delivery of a small variant set, while Keenpix can be easier to forecast when responsive variants change frequently. Test your real catalog and traffic before moving.',
  pricingRows: [
    {
      scenario: 'Up to 5,000 unique remote transformations / month',
      competitor:
        '$0 on Images Free; cached existing variants continue after the limit',
      keenpix: '$9/mo Basic; transformations are not separately metered',
    },
    {
      scenario: '10,000 unique remote transformations / month',
      competitor: '$2.50 on Images Paid after the first 5,000 included',
      keenpix:
        'No transformation charge; application response bytes determine the plan',
    },
    {
      scenario: '100,000 images stored and 100,000 hosted deliveries / month',
      competitor: '$5 storage + $1 delivery on Images Paid',
      keenpix:
        'No managed storage; $9 Basic includes 100 GB returned by Keenpix',
    },
    {
      scenario: 'Remote-origin image delivery',
      competitor: '$0.50 per 1,000 unique transformations after 5,000 included',
      keenpix: '$0.05–0.08/GB overage after the plan allowance',
    },
  ],
  featureRows: [
    {
      feature: 'Primary meter',
      competitor: 'Unique transforms; hosted storage and deliveries',
      keenpix: 'Application response bytes',
    },
    {
      feature: 'Free managed tier',
      competitor: '5,000 unique remote transforms/month',
      keenpix: '14-day cloud trial; no free managed tier',
    },
    {
      feature: 'Original storage',
      competitor: 'Optional Cloudflare Images storage',
      keenpix: 'Use your existing origin',
    },
    {
      feature: 'Custom delivery domain',
      competitor: 'Yes',
      keenpix: 'Not yet',
    },
    {
      feature: 'Workers integration',
      competitor: 'Native Images binding and fetch workflows',
      keenpix: 'HTTP URL API',
    },
    {
      feature: 'Automatic formats',
      competitor: 'AVIF, WebP, JPEG selection with fallbacks',
      keenpix: 'AVIF/WebP negotiation',
    },
    {
      feature: 'Origin controls',
      competitor: 'Zone origin rules or Workers logic',
      keenpix: 'Per-project origin allowlists and optional signed URLs',
    },
    {
      feature: 'Self-hosting',
      competitor: 'Managed Cloudflare service',
      keenpix: 'v0.2.0 code is AGPL-3.0; you operate it',
    },
    {
      feature: 'Image analytics',
      competitor: 'Cloudflare Images usage metrics',
      keenpix: 'Delivery, cache, format, latency, and request analytics',
    },
  ],
  switchReasons: [
    {
      title: 'Forecast from delivered traffic',
      detail:
        'Keenpix bills delivered gigabytes and does not add a charge for each width, crop, or output format. This can simplify forecasting for applications whose variant set changes frequently.',
    },
    {
      title: 'Keep the origin and CDN separable',
      detail:
        'Keenpix reads from allowlisted origins and is designed to sit behind an edge cache. That separation can suit teams that do not want image optimization tied to one storage or CDN account.',
    },
    {
      title: 'A self-operated path',
      detail:
        'The v0.2.0 cloud code is AGPL-3.0 and includes deployment files. The latest published v0.1.11 release remains Apache-2.0 until v0.2.0 is tagged. Self-hosting removes a Keenpix service bill but adds infrastructure and operational work.',
    },
  ],
  whenCompetitorWins: [
    'Your workload stays within 5,000 unique remote transformations per month and the free allowance is sufficient.',
    'You want Cloudflare to store originals, issue direct-upload URLs, and deliver hosted images from custom domains.',
    'Your application already uses Workers and benefits from the native Images binding and edge controls.',
    'You repeatedly deliver a stable, small set of variants; unique-transform pricing may be cheaper than bandwidth pricing.',
    'You need a large global vendor, enterprise support options, and one Cloudflare platform for networking and media.',
  ],
  migrationSteps: [
    'Inventory whether each source is a remote image or stored in Cloudflare Images; export hosted originals to an origin you control before changing delivery.',
    'Create a Keenpix organization project and allowlist every source hostname.',
    'Map Cloudflare width, height, fit, quality, and format options to documented Keenpix query parameters; test unsupported or advanced options separately.',
    'Run representative URLs side by side and compare visual output, cache headers, file size, and latency.',
    'Place your chosen CDN in front of Keenpix, verify its query-string and Accept-header cache behavior, and test cache hits.',
    'Canary a small traffic share, monitor Keenpix application response bytes and errors, then migrate only after the results meet your acceptance thresholds.',
  ],
  faq: [
    {
      q: 'Is Keenpix always cheaper than Cloudflare Images?',
      a: 'No. Cloudflare gives 5,000 unique remote transformations per month free and charges by unique transformation after that; repeat requests for the same transformation in a calendar month do not add transformation usage. Keenpix charges for optimized response bytes returned by its application; upstream edge hits do not reach that meter. The lower-cost model depends on variant count, cache behavior, and bytes delivered.',
    },
    {
      q: 'Can Keenpix replace Cloudflare Images storage?',
      a: 'No. Keenpix does not store originals or provide upload workflows. Keep images in R2, S3, or another origin you operate, and use Keenpix only for transformation and delivery.',
    },
    {
      q: 'What happens on Cloudflare Images Free after 5,000 transformations?',
      a: 'Cloudflare documents that existing cached transformations continue to serve, while new transformations return error 9422. The free plan does not charge overage. Confirm current limits before production rollout.',
    },
  ],
  sources: [
    {
      label: 'Cloudflare Images pricing',
      url: 'https://developers.cloudflare.com/images/pricing/',
    },
    {
      label: 'Cloudflare remote transformation overview',
      url: 'https://developers.cloudflare.com/images/optimization/transformations/overview/',
    },
    {
      label: 'Cloudflare Images limits and formats',
      url: 'https://developers.cloudflare.com/images/get-started/limits/',
    },
    { label: 'Keenpix pricing', url: '/pricing' },
  ],
  pricingAsOf: 'July 2026',
  reviewer: 'Raed Bahri, Keenpix founder and maintainer',
  verifiedAt: '2026-07-12',
  nextReviewAt: '2026-10-12',
} satisfies ComparisonPageData
