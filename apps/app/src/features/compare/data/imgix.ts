import type { ComparisonPageData } from '../comparison-data'

export const imgixComparison = {
  slug: 'imgix-alternative',
  competitor: 'imgix',
  activation: {
    destination: '/signup',
    label: 'Start a 14-day imgix canary',
  },
  title: 'imgix Alternative: Keenpix vs imgix (2026)',
  metaDescription:
    "Compare Keenpix and imgix after imgix's 2025 credit switch: one delivery meter, published rates, an AGPL self-host option, and a URL migration map.",
  heroHeadline: 'Keenpix vs imgix: a predictable image CDN alternative',
  heroSubhead:
    'Keenpix bills optimized bytes delivered through managed cloud — no credits, management meter, request fees, or seat charges. Published v0.3.1 is AGPL-3.0 and can be self-hosted without a Keenpix license fee, or used as a managed service from $9/month.',
  verdict:
    "imgix has a broader rendering API — if you lean on face-aware cropping, text overlays, video, or its long tail of advanced parameters, Keenpix won't replace that today, and a mature vendor with enterprise support may matter more to you than price. imgix's credit model draws delivery and cached-storage management from one pool, with published self-serve packages from $25 Starter through $500 Growth Plus. Keenpix charges for managed delivery, publishes self-serve overage rates, and includes analytics on every tier. For core resize, crop, quality, and modern-format delivery, compare both services on your own traffic during the trial; do not assume feature or output parity.",
  pricingRows: [
    {
      scenario: '100 GB delivered / month',
      competitor: '$25/mo Starter (100 credits, before management credits)',
      keenpix: '$9/mo Basic — 100 GB included',
    },
    {
      scenario: '400 GB delivered / month',
      competitor: '$150/mo Midrange (830 credits, before management credits)',
      keenpix: '$29 Pro — 400 GB included',
    },
    {
      scenario: '1 TB delivered / month',
      competitor: '$300/mo Growth (1,875 credits)',
      keenpix: '$69 Business — 1 TB included',
    },
    {
      scenario: '50 GB of cached originals under management',
      competitor: '100 credits/mo (2 credits per GB/mo)',
      keenpix: '$0 — no storage or management meter',
    },
    {
      scenario: 'Overage beyond plan',
      competitor:
        'Published packages end at $500/mo Growth Plus; larger needs require current terms',
      keenpix: '$0.07–0.12/GB; paid delivery stays online',
    },
    {
      scenario: 'Transformations',
      competitor:
        'Credit use varies by feature; delivery and management also draw credits',
      keenpix: 'Unlimited on every plan — managed delivery is the only meter',
    },
  ],
  featureRows: [
    {
      feature: 'Pricing model',
      competitor: 'Credits: 1/GB delivered + 2/GB/mo managed storage',
      keenpix: 'Delivered GB only — one meter',
    },
    {
      feature: 'Published pricing',
      competitor: 'Self-serve packages to $500/mo Growth Plus',
      keenpix: 'Every tier and overage rate published',
    },
    {
      feature: 'Entry plan',
      competitor: '$25/mo · 100 credits',
      keenpix: '$9/mo · 100 GB managed delivery',
    },
    {
      feature: 'Transformations',
      competitor: 'Feature-dependent credit use; verify the operation mix',
      keenpix: 'Unlimited, never metered',
    },
    {
      feature: 'Rendering API depth',
      competitor: 'Best-in-class, very deep',
      keenpix: 'Documented core resize, crop, quality, and format modifiers',
    },
    {
      feature: 'Auto AVIF/WebP',
      competitor: 'Yes (auto=format)',
      keenpix: 'Yes — Accept-header negotiation',
    },
    {
      feature: 'Analytics',
      competitor: 'Usage reporting',
      keenpix: 'Every tier: cache hits, bandwidth saved, latency, live logs',
    },
    {
      feature: 'Self-hosting',
      competitor: 'No',
      keenpix: 'v0.3.1: AGPL-3.0 with Docker deployment files',
    },
    {
      feature: 'Signed URLs',
      competitor: 'Yes (HMAC)',
      keenpix: 'Optional HMAC; no public API keys',
    },
    {
      feature: 'Works behind your CDN',
      competitor: 'Bundled CDN (Fastly)',
      keenpix: 'Designed to sit behind Cloudflare etc.',
    },
    {
      feature: 'Video',
      competitor: 'Yes',
      keenpix: 'No',
    },
    {
      feature: 'Custom domains',
      competitor: 'Yes',
      keenpix: 'Pro: 1 · Business: 10',
    },
    {
      feature: 'Overage behavior',
      competitor: 'Confirm current credit-limit handling with imgix',
      keenpix: 'Usage alerts and projected charges; no normal hard stop',
    },
    {
      feature: 'Vendor profile',
      competitor: 'Established since 2011, premium brand',
      keenpix: 'Young, solo-founder, open source',
    },
  ],
  switchReasons: [
    {
      title: 'One meter you can actually predict',
      detail:
        "imgix's August 2025 credit model bills delivery at 1 credit/GB and managed cached storage at 2 credits per GB per month, from one pooled balance. Keenpix has one billing meter: optimized bytes delivered through its managed edge and application, counted once.",
    },
    {
      title: 'Published pricing, no renewal roulette',
      detail:
        'Keenpix publishes overage of $0.07–0.12/GB for every self-serve tier. imgix publishes packages through Growth Plus at $500/month; larger requirements need current terms. Compare a written imgix quote with your measured workload rather than relying on third-party anecdotes.',
    },
    {
      title: 'Always-on paid usage with transparent rates',
      detail:
        'imgix publishes credit allowances, but teams should confirm current overage and enforcement behavior directly for their plan. Keenpix continues paid delivery at its published per-GB rate and shows projected charges throughout the billing period.',
    },
    {
      title: 'An AGPL self-host option in v0.3.1',
      detail:
        'The published v0.3.1 release is AGPL-3.0 and includes Docker/Coolify deployment files. You can operate it in-house while owning infrastructure and routing. imgix is managed-only.',
    },
    {
      title: 'Analytics on every plan, not a premium add-on',
      detail:
        'Bandwidth saved, cache hit rate, format mix, top images, latency percentiles, and live request logs come with the $9/mo plan. You can see exactly what the optimizer is doing for you — which is also how you verify whether switching was worth it.',
    },
  ],
  whenCompetitorWins: [
    "You depend on imgix's deep rendering features — face-aware cropping, text overlays, palette extraction, and the long tail of parameters Keenpix doesn't replicate.",
    'You need video processing and delivery from the same pipeline; Keenpix is images only.',
    'You need the broader mature imgix ecosystem rather than Keenpix’s focused transform-and-deliver workflow.',
    'You want an established vendor (operating since 2011) with enterprise support and SLAs rather than a young, solo-founder product.',
    "Your usage fits comfortably inside a current imgix plan and renewal terms you've confirmed — switching has real costs, and 'it works and the price is known' is a fine reason to stay.",
  ],
  migrationSteps: [
    'Create a Keenpix project and allowlist your origin host(s). Keenpix pulls from the same S3 bucket or web folder imgix reads from, so no assets move and there are no API keys to manage.',
    'Map your URL parameters. Most carry over unchanged: w→w, h→h, q→q, fit→fit, dpr→dpr, blur→blur. Renames: fm→fmt, rot→rotate, rect/crop→extract. Mirroring: imgix flip=v becomes flip, flip=h becomes flop.',
    'Rewrite the URL shape: https://yoursub.imgix.net/hero.jpg?w=800&fm=avif becomes https://cdn.keenpix.com/p/<project-id>/img/https://origin.example.com/hero.jpg?w=800&fmt=avif. You can usually drop fm entirely — Keenpix negotiates AVIF/WebP automatically from the Accept header.',
    'Update your image URL helper or framework <Image> loader. Most codebases build imgix URLs in one function, so this is typically a single-file change.',
    "Put Keenpix behind your existing CDN (Cloudflare or similar — it's designed for that) and run both services side by side on a slice of traffic, diffing output with the live request logs.",
    'Watch projected overage, cache hit rate, and managed delivery in the dashboard for a week.',
    'Cut the remaining traffic over and cancel imgix before the next credit-cycle renewal.',
  ],
  faq: [
    {
      q: 'Is Keenpix a drop-in replacement for imgix?',
      a: "For resize, crop, quality, DPR, and format workloads — which covers most imgix usage — yes, with a mechanical parameter rename (fm→fmt, rot→rotate, rect→extract; the rest map 1:1). It is not a replacement for imgix's video features or its most advanced rendering parameters.",
    },
    {
      q: 'What changed with imgix pricing in August 2025?',
      a: 'imgix moved its published plans to a credit model. Current monthly packages are Starter $25 for 100 credits, Basic $75 for 375, Midrange $150 for 830, Growth $300 for 1,875, and Growth Plus $500 for 3,570. Delivery costs 1 credit per GB and management costs 2 credits per GB per month of cached storage, from one pooled balance.',
    },
    {
      q: 'How should I compare imgix enterprise pricing?',
      a: 'Request a current written quote from imgix and model it against your own delivery and managed-source usage. Keenpix does not use unverified third-party renewal anecdotes as pricing evidence.',
    },
    {
      q: 'How does Keenpix billing work?',
      a: 'One meter: managed image delivery. Basic is $9 for 100 GB then $0.12/GB, Pro is $29 for 400 GB then $0.09/GB, and Business is $69 for 1 TB then $0.07/GB. Cloudflare edge hits and application responses count once. Transformations and team members are unlimited; paid usage continues and accumulated overage is charged at period end.',
    },
    {
      q: 'Can I self-host Keenpix instead of paying for cloud?',
      a: 'The published v0.3.1 release is licensed AGPL-3.0 and includes Docker and Coolify deployment files. Self-hosting has no Keenpix license fee, but you operate the infrastructure.',
    },
    {
      q: 'What does Keenpix not do?',
      a: 'No video, storage, or DAM: Keenpix transforms and delivers from origins you already have. Managed custom domains are included on Pro and Business. It is also a young product from a solo founder, so buyers should weigh vendor maturity and support needs.',
    },
  ],
  evaluationChecks: [
    'Export one normal and one peak month of imgix delivery GB, managed-media GB, and every transformation class that consumes credits; do not substitute package maximums for measured use.',
    'Run the same allowlisted source images through both services for resize, crop, quality, DPR, format negotiation, and each advanced imgix operation you rely on. Record output dimensions, content type, response headers, and visual fixtures.',
    'Request every test URL cold and warm, then compare cache behavior, failure responses, signing, invalidation, observability, and the exact credit or managed-delivery units recorded by each dashboard.',
    'Canary one bounded route for a complete traffic cycle. Accept only if output, errors, latency, projected cost, and rollback meet thresholds written before the test.',
  ],
  sources: [
    { label: 'imgix pricing', url: 'https://www.imgix.com/pricing' },
    {
      label: 'imgix credit pricing FAQ',
      url: 'https://www.imgix.com/pricing-faq',
    },
    {
      label: 'imgix credit consumption guide',
      url: 'https://www.imgix.com/credit-consumption',
    },
    {
      label: 'imgix rendering API',
      url: 'https://docs.imgix.com/en-US/apis/rendering/overview',
    },
    { label: 'imgix payment policy', url: 'https://www.imgix.com/payments' },
    { label: 'Keenpix pricing', url: '/pricing' },
    {
      label: 'Keenpix transform parameters',
      url: '/docs/reference/parameters',
    },
    {
      label: 'Keenpix v0.3.1 release',
      url: 'https://github.com/lord007tn/keenpix/releases/tag/v0.3.1',
    },
  ],
  pricingAsOf: 'August 31, 2026',
  reviewer: 'Raed Bahri, Keenpix founder and maintainer',
  verifiedAt: '2026-08-31',
  nextReviewAt: '2026-10-12',
} satisfies ComparisonPageData
