import type { ComparisonPageData } from '../comparison-data'

export const imgixComparison = {
  slug: 'imgix-alternative',
  competitor: 'imgix',
  title: 'imgix Alternative: Keenpix vs imgix (2026)',
  metaDescription:
    "Compare Keenpix and imgix after imgix's 2025 credit switch: one bandwidth meter, published rates, an AGPL self-host option, and a URL param migration map.",
  heroHeadline: 'Keenpix vs imgix: a predictable image CDN alternative',
  heroSubhead:
    'Keenpix bills optimized response bytes returned by the application — no credits or management meter, and upstream CDN edge hits do not reach the meter. The upcoming v0.2.0 code is AGPL-3.0 and can be self-hosted without a Keenpix license fee, or used as a managed service from $9/month.',
  verdict:
    "imgix has a broader rendering API — if you lean on face-aware cropping, text overlays, video, or its long tail of advanced parameters, Keenpix won't replace that today, and a mature vendor with enterprise support may matter more to you than price. imgix's August 2025 credit model draws delivery and cached-storage management from one pool, its published self-serve plans stop at $300/month, and larger requirements need a quote. Keenpix charges for application response bytes, publishes self-serve overage rates, and includes analytics on every tier. For core resize, crop, quality, and modern-format delivery, compare both services on your own traffic during the trial; do not assume feature or output parity.",
  pricingRows: [
    {
      scenario: '100 GB delivered / month',
      competitor: '$25/mo Starter (100 credits, before management credits)',
      keenpix: '$9/mo Basic — 100 GB included',
    },
    {
      scenario: '400 GB delivered / month',
      competitor:
        '$75/mo Basic maxes at 375 credits; next tier is $300/mo Growth',
      keenpix: '$19/mo Pro — 400 GB included',
    },
    {
      scenario: '1 TB delivered / month',
      competitor: '$300/mo Growth (1,875 credits)',
      keenpix: '$29/mo Business — 1 TB included',
    },
    {
      scenario: '50 GB of cached originals under management',
      competitor: '100 credits/mo (2 credits per GB/mo)',
      keenpix: '$0 — no storage or management meter',
    },
    {
      scenario: 'Overage beyond plan',
      competitor: 'Not published — contact imgix for current enterprise terms',
      keenpix:
        '$0.05–0.08/GB, published; your spend cap pauses delivery instead',
    },
    {
      scenario: 'Transformations',
      competitor: 'Rendering included; delivery + management billed in credits',
      keenpix: 'Unlimited on every plan — bandwidth is the only meter',
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
      competitor: 'Self-serve to $300/mo; above that, sales',
      keenpix: 'Every tier and overage rate published',
    },
    {
      feature: 'Entry plan',
      competitor: '$25/mo · 100 credits',
      keenpix: '$9/mo · 100 GB returned by Keenpix',
    },
    {
      feature: 'Transformations',
      competitor: 'Unlimited renders; delivery draws credits',
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
      keenpix: 'Upcoming v0.2.0: AGPL-3.0 with Docker deployment files',
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
      keenpix: 'Not yet',
    },
    {
      feature: 'Overage behavior',
      competitor: 'Confirm current credit-limit handling with imgix',
      keenpix: 'Customer-set spend cap, on by default',
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
        "imgix's August 2025 credit model bills delivery at 1 credit/GB and managed cached storage at 2 credits per GB per month, from one pooled balance. Keenpix has one billing meter: optimized response bytes returned by the application. An upstream CDN edge hit does not reach that meter.",
    },
    {
      title: 'Published pricing, no renewal roulette',
      detail:
        'Keenpix publishes rates and overage ($0.05–0.08/GB depending on plan) for every self-serve tier. imgix publishes self-serve plans through Growth at $300/month; larger requirements need a current quote. Compare a written imgix quote with your measured workload rather than relying on third-party anecdotes.',
    },
    {
      title: 'A spend cap instead of a blocked account',
      detail:
        'imgix publishes credit allowances, but teams should confirm current overage and enforcement behavior directly for their plan. Keenpix ships a hard overage cap that you control, on by default at roughly 2x your plan price; delivery pauses when that customer-set limit is reached.',
    },
    {
      title: 'An AGPL self-host option in v0.2.0',
      detail:
        'The upcoming v0.2.0 release is AGPL-3.0 and includes Docker/Coolify deployment files; the latest published v0.1.11 remains Apache-2.0 until v0.2.0 is tagged. You can operate a released version in-house, while owning infrastructure and routing. imgix is managed-only.',
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
    "You need a custom delivery domain today — Keenpix doesn't offer them yet.",
    'You want an established vendor (operating since 2011) with enterprise support and SLAs rather than a young, solo-founder product.',
    "Your usage fits comfortably inside a current imgix plan and renewal terms you've confirmed — switching has real costs, and 'it works and the price is known' is a fine reason to stay.",
  ],
  migrationSteps: [
    'Create a Keenpix project and allowlist your origin host(s). Keenpix pulls from the same S3 bucket or web folder imgix reads from, so no assets move and there are no API keys to manage.',
    'Map your URL parameters. Most carry over unchanged: w→w, h→h, q→q, fit→fit, dpr→dpr, blur→blur. Renames: fm→fmt, rot→rotate, rect/crop→extract. Mirroring: imgix flip=v becomes flip, flip=h becomes flop.',
    'Rewrite the URL shape: https://yoursub.imgix.net/hero.jpg?w=800&fm=avif becomes /img/https://origin.example.com/hero.jpg?project=yourproject&w=800&fmt=avif. You can usually drop fm entirely — Keenpix negotiates AVIF/WebP automatically from the Accept header.',
    'Update your image URL helper or framework <Image> loader. Most codebases build imgix URLs in one function, so this is typically a single-file change.',
    "Put Keenpix behind your existing CDN (Cloudflare or similar — it's designed for that) and run both services side by side on a slice of traffic, diffing output with the live request logs.",
    'Confirm your overage spend cap (on by default at about 2x plan price) and watch cache hit rate and application response bytes in the dashboard for a week.',
    'Cut the remaining traffic over and cancel imgix before the next credit-cycle renewal.',
  ],
  faq: [
    {
      q: 'Is Keenpix a drop-in replacement for imgix?',
      a: "For resize, crop, quality, DPR, and format workloads — which covers most imgix usage — yes, with a mechanical parameter rename (fm→fmt, rot→rotate, rect→extract; the rest map 1:1). It is not a replacement for imgix's video features or its most advanced rendering parameters.",
    },
    {
      q: 'What changed with imgix pricing in August 2025?',
      a: 'imgix moved all plans to a credit model: Starter $25/mo for 100 credits, Basic $75/mo for 375, Growth $300/mo for 1,875. Delivery costs 1 credit per GB and management costs 2 credits per GB per month of cached storage, from one pooled balance. Pricing above Growth is not published.',
    },
    {
      q: 'How should I compare imgix enterprise pricing?',
      a: 'Request a current written quote from imgix and model it against your own delivery and managed-source usage. Keenpix does not use unverified third-party renewal anecdotes as pricing evidence.',
    },
    {
      q: 'How does Keenpix billing work?',
      a: 'One meter: bandwidth delivered. Basic is $9/mo for 100 GB then $0.08/GB, Pro $19/mo for 400 GB then $0.06/GB, Business $29/mo for 1 TB then $0.05/GB, with annual billing giving two months free. Transformations are unlimited on every plan, and a customer-set spend cap (on by default) pauses delivery rather than letting overage run.',
    },
    {
      q: 'Can I self-host Keenpix instead of paying for cloud?',
      a: 'The v0.2.0 cloud code is licensed AGPL-3.0 and includes Docker and Coolify deployment files. The latest published v0.1.11 release remains Apache-2.0 until v0.2.0 is tagged. Self-hosting has no Keenpix license fee, but you operate the infrastructure.',
    },
    {
      q: 'What does Keenpix not do?',
      a: "No video, no storage or DAM (it transforms and delivers from origins you already have), and custom domains aren't available yet. It is also a young product from a solo founder, so buyers should weigh vendor maturity and support needs.",
    },
  ],
  sources: [
    { label: 'imgix pricing', url: 'https://www.imgix.com/pricing' },
    {
      label: 'imgix credit pricing FAQ',
      url: 'https://www.imgix.com/pricing-faq',
    },
    { label: 'imgix payment policy', url: 'https://www.imgix.com/payments' },
    { label: 'Keenpix pricing', url: '/pricing' },
  ],
  pricingAsOf: 'July 2026',
  reviewer: 'Raed Bahri, Keenpix founder and maintainer',
  verifiedAt: '2026-07-12',
  nextReviewAt: '2026-10-12',
} satisfies ComparisonPageData
