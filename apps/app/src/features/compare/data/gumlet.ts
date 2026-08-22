import type { ComparisonPageData } from '../comparison-data'

export const gumletComparison = {
  slug: 'gumlet-alternative',
  competitor: 'Gumlet Image',
  title: 'Gumlet Alternative: Keenpix vs Gumlet Image (2026)',
  metaDescription:
    'Keenpix vs Gumlet Image (August 2026): compare bandwidth pricing, analytics, origin support, security, migration work, and self-hosting.',
  heroHeadline: 'Keenpix vs Gumlet Image: two bandwidth-priced image CDNs',
  heroSubhead:
    'Both services optimize images from origins you already control and meter managed delivery by bandwidth. The meaningful differences are plan economics, source and integration breadth, operational maturity, and whether you need a supported self-host path.',
  verdict:
    'Choose Gumlet Image when its free 30 GB tier, broad source integrations, WordPress workflow, mature CloudFront delivery, or combined image-and-video vendor relationship matters. Choose Keenpix when the published $9/100 GB, $29/400 GB, or $69/1 TB managed tiers fit your traffic, or when an AGPL-3.0 self-host path is part of the architecture. This is not a claim that one CDN is universally faster or cheaper: cache behavior, regions, transformations, source files, contract terms, and overage can reverse a real result. Test both with your own catalog and delivery pattern.',
  pricingRows: [
    {
      scenario: 'Free evaluation',
      competitor: 'Free: 30 GB/month, 1 seat, then $0.50/GB',
      keenpix: '14-day trial: up to 20 GB and 2 projects; card required',
    },
    {
      scenario: '100 GB delivered / month',
      competitor: '$32 Growth includes 300 GB',
      keenpix: '$9 Basic includes 100 GB',
    },
    {
      scenario: '300 GB delivered / month',
      competitor: '$32 Growth includes 300 GB',
      keenpix: '$29 Pro includes 400 GB',
    },
    {
      scenario: '1 TB delivered / month',
      competitor: '$137 estimate on Growth: $32 plus 700 GB at $0.15/GB',
      keenpix: '$69 Business includes 1 TB',
    },
    {
      scenario: '2.5 TB delivered / month',
      competitor: '$199 Business includes 2.5 TB',
      keenpix: '$174 estimate on Business: $69 plus 1.5 TB at $0.07/GB',
    },
    {
      scenario: 'Meter definition',
      competitor:
        'Gumlet image usage documentation says bandwidth is the single usage metric',
      keenpix:
        'Optimized bytes delivered through the managed Keenpix network; transforms and seats are not metered',
    },
  ],
  featureRows: [
    {
      feature: 'Original image storage',
      competitor:
        'Bring your own: web folders/proxy, S3, R2, GCS, Azure, Wasabi, Cloudinary, and other documented sources',
      keenpix:
        'Bring your own HTTP/S3/R2-compatible origin; no upload library or DAM',
    },
    {
      feature: 'Modern formats',
      competitor: 'Automatic WebP/AVIF plus URL-based image transforms',
      keenpix: 'AVIF/WebP negotiation plus URL-based Sharp transforms',
    },
    {
      feature: 'Managed delivery',
      competitor: 'CloudFront-backed image delivery',
      keenpix: 'Cloudflare-backed managed delivery on cdn.keenpix.com',
    },
    {
      feature: 'Analytics',
      competitor:
        'Bandwidth, requests, transformations, origin hit ratio, response time, status classes, and top assets',
      keenpix:
        'Bandwidth saved, requests, cache hit rate, formats, latency, top paths, and live logs',
    },
    {
      feature: 'URL security',
      competitor:
        'Optional signed image URLs, expiry, and documented referrer restrictions for web-proxy sources',
      keenpix:
        'Per-project origin allowlists, SSRF hardening, and optional HMAC signatures',
    },
    {
      feature: 'Custom domains',
      competitor:
        'Supported on paid plans; documentation lists $5/month for additional domains',
      keenpix: 'Pro includes 1; Business includes 10',
    },
    {
      feature: 'Framework and CMS integrations',
      competitor:
        'Documented JavaScript, WordPress, Next.js, React, Astro, and source-specific workflows',
      keenpix:
        'URL loaders/guides for Next.js, Nuxt, React, Vue, SvelteKit, Astro, Remix, TanStack, and HTML',
    },
    {
      feature: 'Video platform',
      competitor:
        'Separate Gumlet Video product with hosting, streaming, DRM, analytics, and APIs',
      keenpix: 'No video product',
    },
    {
      feature: 'Self-hosting',
      competitor: 'No public self-hosted Gumlet Image edition documented',
      keenpix: 'Published v0.3.0 under AGPL-3.0 with Docker deployment files',
    },
    {
      feature: 'Managed entry price',
      competitor: 'Free 30 GB; Growth $32 for 300 GB',
      keenpix: 'Basic $9 for 100 GB; no permanent free plan',
    },
  ],
  switchReasons: [
    {
      title: 'The lower Keenpix tiers may fit small managed workloads',
      detail:
        'Keenpix publishes $9 for 100 GB and $29 for 400 GB. Gumlet publishes a permanent 30 GB free tier and then $32 Growth with 300 GB. Compare the full plan, not only one unit price: a free tier, included domains, source support, analytics, and overage may matter more than the headline allowance.',
    },
    {
      title: 'A supported self-host path changes the exit plan',
      detail:
        'Keenpix publishes its current engine under AGPL-3.0 with Docker deployment files. Self-hosting removes the Keenpix service fee but makes your team responsible for infrastructure, CDN configuration, database backups, upgrades, abuse controls, monitoring, and incidents.',
    },
    {
      title: 'One URL grammar across managed and self-hosted delivery',
      detail:
        'Keenpix uses the same core transform concepts across both deployment paths. Moving still requires a planned hostname, project configuration, cache warm-up, URL migration, and canary validation; it is not an automatic toggle.',
    },
    {
      title: 'Project controls are visible in the application',
      detail:
        'Keenpix keeps origin allowlists, optional signatures, request logs, cache metrics, latency, and bandwidth reporting in the same project dashboard. Verify that this narrower workflow covers the source and governance controls you currently use in Gumlet.',
    },
  ],
  whenCompetitorWins: [
    'You want a permanent free tier for up to 30 GB of image bandwidth rather than a time-limited trial.',
    'You need Gumlet’s documented WordPress workflow or one of its broader managed source integrations.',
    'You want image and video infrastructure from the same established vendor; Keenpix has no video product.',
    'You need Gumlet’s current operational scale, support model, or enterprise terms rather than a young solo-founder product.',
    'A CloudFront-backed delivery architecture or Gumlet-specific image analytics is already part of your platform standards.',
  ],
  migrationSteps: [
    'Export an inventory of Gumlet sources, custom domains, security settings, signed-URL behavior, query parameters, and current bandwidth. Keep Gumlet running during the migration.',
    'Create a Keenpix project for each isolation boundary and allowlist every origin host it must fetch. Keenpix does not copy or store your originals.',
    'Translate the URL grammar in a test helper: Gumlet width/height/format parameters map to Keenpix w/h/fmt, but audit every crop, fit, quality, focal-point, and animation option because the APIs are not feature-identical.',
    'Replace the Gumlet hostname or integration output with the canonical managed Keenpix path, https://cdn.keenpix.com/p/<project-id>/img/<encoded-origin>, or with your planned self-host/custom hostname.',
    'If Gumlet signed URLs are enabled, implement Keenpix HMAC signing at a server boundary. Do not put either service’s signing secret in browser code.',
    'Run representative images side by side. Compare decoded output, Content-Type, Vary, Cache-Control, byte size, first uncached response, repeat cache behavior, errors, and origin access—not a borrowed compression percentage.',
    'Canary a small traffic share, monitor both vendors’ delivery and error metrics, then update URLs and DNS only after rollback has been tested.',
  ],
  faq: [
    {
      q: 'Are Gumlet Image and Keenpix billed the same way?',
      a: 'Both publish bandwidth-led image pricing. Gumlet’s image usage guide says all Gumlet image usage is calculated on bandwidth and reports requests and transformations as analytics. Keenpix meters optimized bytes delivered through its managed network and does not separately meter transformations or team members. The plan allowances, overage rates, free/trial model, and included features differ.',
    },
    {
      q: 'Does either service store my original images?',
      a: 'Neither requires moving originals into a DAM for the image-CDN workflow. Gumlet documents web folders, proxy sources, and multiple cloud storage providers. Keenpix fetches from approved HTTP or object-storage origins. You remain responsible for the originals and access permissions.',
    },
    {
      q: 'Which one is cheaper at 1 TB per month?',
      a: 'Using the public August 2026 self-service rates and exactly 1,000 GB, Gumlet Growth estimates to $137 ($32 plus 700 GB at $0.15), while Keenpix Business lists $69 for 1 TB. That is a pricing scenario, not a universal bill: unit definitions, taxes, annual discounts, contracts, cache behavior, and other requirements can change the result.',
    },
    {
      q: 'Can Gumlet Image be self-hosted?',
      a: 'Gumlet’s public image documentation describes a managed cloud service and does not document a self-hosted Gumlet Image edition. Keenpix publishes its current engine under AGPL-3.0. Confirm current commercial options directly with Gumlet before treating the public documentation as exhaustive.',
    },
    {
      q: 'Does Keenpix replace Gumlet Video?',
      a: 'No. Keenpix processes images only. If Gumlet Video hosting, streaming, DRM, player analytics, or video APIs are part of your stack, keep them or select a separate video platform.',
    },
    {
      q: 'Can I keep the same custom image domain?',
      a: 'Potentially, but moving a production hostname requires DNS ownership, provider verification, certificate readiness, cache planning, and a rollback window. Do not point the hostname at Keenpix until representative URLs and security behavior pass on a temporary host.',
    },
  ],
  sources: [
    { label: 'Gumlet pricing', url: 'https://www.gumlet.com/pricing/' },
    {
      label: 'Gumlet image pricing and company facts',
      url: 'https://www.gumlet.com/llm-info/',
    },
    {
      label: 'Gumlet image usage analytics',
      url: 'https://docs.gumlet.com/docs/usage-analytics-for-images',
    },
    {
      label: 'Gumlet original media storage',
      url: 'https://docs.gumlet.com/docs/original-image-storage',
    },
    {
      label: 'Gumlet signed image URLs',
      url: 'https://docs.gumlet.com/docs/signed-urls-image',
    },
    { label: 'Keenpix pricing', url: '/pricing' },
  ],
  pricingAsOf: 'August 2026',
  reviewer: 'Raed Bahri, Keenpix founder and maintainer',
  verifiedAt: '2026-08-22',
  nextReviewAt: '2026-10-12',
} satisfies ComparisonPageData
