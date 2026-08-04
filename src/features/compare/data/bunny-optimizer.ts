import type { ComparisonPageData } from '../comparison-data'

export const bunnyOptimizerComparison = {
  slug: 'bunny-optimizer-alternative',
  competitor: 'Bunny Optimizer',
  title: 'Bunny Optimizer Alternative: Keenpix vs Bunny.net (2026)',
  metaDescription:
    'Keenpix vs Bunny Optimizer: flat optimizer fee plus CDN bandwidth versus bandwidth plans, feature differences, migration steps, and when each wins.',
  heroHeadline: 'Keenpix vs Bunny Optimizer: two predictable pricing models',
  heroSubhead:
    'Bunny Optimizer charges $9.50 per website for unlimited optimizations, requests, and transformations, with Bunny CDN bandwidth billed separately. Keenpix bundles a bandwidth allowance and unlimited transforms into each plan.',
  verdict:
    'Bunny Optimizer is a strong choice when you want a mature CDN, custom hostnames, per-website flat optimizer pricing, and broader website optimization including CSS and JavaScript minification. Keenpix is a focused alternative when you want image-only delivery, a single bundled bandwidth plan, detailed image analytics, always-on metered overage, or a self-operated path. Bunny can be cheaper at high volume depending on CDN region and tier; Keenpix may be simpler when a bundled allowance is more useful than a separate optimizer fee and bandwidth bill.',
  pricingRows: [
    {
      scenario: 'Optimizer service',
      competitor:
        '$9.50 per website/month; unlimited optimization, requests, and transformations',
      keenpix:
        'Included in each $9–$29 bandwidth plan; unlimited transformations',
    },
    {
      scenario: '100 GB image delivery / month',
      competitor:
        '$9.50 + Bunny CDN bandwidth at the applicable regional/tier rate',
      keenpix: '$9 Basic, 100 GB included',
    },
    {
      scenario: '400 GB image delivery / month',
      competitor:
        '$9.50 + Bunny CDN bandwidth at the applicable regional/tier rate',
      keenpix: '$19 Pro, 400 GB included',
    },
    {
      scenario: '1 TB image delivery / month',
      competitor:
        '$9.50 + Bunny CDN bandwidth at the applicable regional/tier rate',
      keenpix: '$39 Business, 1 TB included',
    },
    {
      scenario: 'Additional website / pull zone',
      competitor:
        'Another $9.50 optimizer fee; contact sales above 20 websites',
      keenpix:
        'Projects share organization entitlement and bandwidth; confirm plan limits',
    },
  ],
  featureRows: [
    {
      feature: 'Billing model',
      competitor: 'Optimizer fee per website + CDN bandwidth',
      keenpix: 'Bundled delivered-bandwidth plan',
    },
    {
      feature: 'Transformations',
      competitor: 'Unlimited',
      keenpix: 'Unlimited',
    },
    {
      feature: 'CDN',
      competitor: 'Bunny CDN pull zone',
      keenpix: 'Use the CDN you choose',
    },
    {
      feature: 'CSS / JavaScript minification',
      competitor: 'Yes',
      keenpix: 'No — image pipeline only',
    },
    {
      feature: 'Dynamic image API',
      competitor: 'Resize, crop, quality, format, effects, and watermarking',
      keenpix: 'Core resize, crop, quality, format, and image modifiers',
    },
    {
      feature: 'Custom delivery hostname',
      competitor: 'Yes through Bunny CDN',
      keenpix: 'Not yet',
    },
    {
      feature: 'Storage',
      competitor: 'Optional Bunny Storage, billed separately',
      keenpix: 'No storage; use your existing origin',
    },
    {
      feature: 'Spend control',
      competitor: 'Account billing and CDN controls',
      keenpix: 'Usage alerts; paid delivery stays online',
    },
    {
      feature: 'Self-hosting',
      competitor: 'Managed Bunny service',
      keenpix: 'v0.2.0 code is AGPL-3.0; you operate it',
    },
  ],
  switchReasons: [
    {
      title: 'One bundled image-delivery allowance',
      detail:
        'Keenpix combines optimization and managed delivery into one allowance, counted once across its edge and application. This can be easier to budget than a per-pull-zone optimizer fee plus region-dependent CDN bandwidth, though it is not automatically cheaper.',
    },
    {
      title: 'Image-specific operational analytics',
      detail:
        'Keenpix exposes cache hit rate, bytes saved, format mix, latency percentiles, top images, and live request logs on every tier so teams can inspect the image pipeline directly.',
    },
    {
      title: 'A self-operated deployment option',
      detail:
        'The v0.2.0 cloud code is AGPL-3.0 and includes Docker and Coolify deployment paths. The latest published v0.1.11 remains Apache-2.0 until v0.2.0 is tagged. Self-hosting requires operating and securing the service yourself.',
    },
  ],
  whenCompetitorWins: [
    'You want Bunny CDN and Optimizer configured together with custom delivery hostnames.',
    'You need automatic CSS and JavaScript minification in addition to image optimization.',
    'Your traffic is high enough that Bunny CDN regional or volume rates produce a lower tested total cost.',
    'You use Bunny Storage, Stream, Shield, or its broader platform and prefer one established vendor.',
    'You need enterprise support options, a larger operating team, or a mature global CDN footprint.',
  ],
  migrationSteps: [
    'Export your current Bunny pull-zone and Optimizer settings, including allowed origins, cache rules, tokens, image classes, and every transform parameter in use.',
    'Create a Keenpix organization project and allowlist the original source hosts; Bunny Storage can remain an origin during a staged migration.',
    'Map Bunny width, height, crop, quality, format, and other used parameters to documented Keenpix equivalents. Treat CSS/JavaScript minification and unsupported effects as separate workloads.',
    'Generate representative URLs from production traffic and compare output dimensions, visual quality, formats, cache headers, and bytes.',
    'Put a CDN in front of Keenpix, configure query-string and Accept-header cache variation correctly, then verify cache hits before sending user traffic.',
    'Canary traffic, compare the complete Bunny optimizer-plus-bandwidth cost with Keenpix managed delivery, and cut over only after error and quality checks pass.',
  ],
  faq: [
    {
      q: 'Is Bunny Optimizer cheaper than Keenpix?',
      a: 'It can be. Bunny charges $9.50 per website for Optimizer and bills CDN bandwidth separately; Keenpix includes bandwidth in plans starting at $9. The answer depends on Bunny region and tier, the number of websites or pull zones, bytes delivered, and any existing Bunny commitments.',
    },
    {
      q: 'Does Bunny Optimizer meter transformations?',
      a: 'Bunny documents unlimited optimization, requests, and transformations in its $9.50 per-website fee. CDN bandwidth is billed separately.',
    },
    {
      q: 'Does Keenpix replace every Bunny Optimizer feature?',
      a: 'No. Keenpix is image-focused and does not replace Bunny CSS or JavaScript minification, its CDN platform, storage, custom hostnames, or every advanced image effect. Inventory and test the exact features you use.',
    },
  ],
  sources: [
    {
      label: 'Bunny Optimizer pricing documentation',
      url: 'https://docs.bunny.net/optimizer/pricing',
    },
    {
      label: 'Bunny Optimizer product pricing',
      url: 'https://bunny.net/pricing/optimizer/',
    },
    {
      label: 'Bunny Optimizer product overview',
      url: 'https://bunny.net/optimizer/',
    },
    {
      label: 'Bunny Optimizer dynamic image documentation',
      url: 'https://docs.bunny.net/optimizer/dynamic-images/quality',
    },
    { label: 'Keenpix pricing', url: '/pricing' },
  ],
  pricingAsOf: 'July 2026',
  reviewer: 'Raed Bahri, Keenpix founder and maintainer',
  verifiedAt: '2026-07-12',
  nextReviewAt: '2026-10-12',
} satisfies ComparisonPageData
