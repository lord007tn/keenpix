import type { ComparisonPageData } from '../comparison-data'

export const imagekitComparison = {
  slug: 'imagekit-alternative',
  competitor: 'ImageKit',
  title: 'ImageKit Alternative: Keenpix vs ImageKit (2026)',
  metaDescription:
    'Keenpix vs ImageKit, August 2026: same $9 entry but 100 GB vs 40 GB, phase-specific overage, AGPL self-hosting — and where ImageKit still wins.',
  heroHeadline: 'Keenpix vs ImageKit: a bandwidth-first alternative',
  heroSubhead:
    'ImageKit publishes bandwidth pricing; Keenpix publishes a managed-delivery meter. Keenpix bundles more delivery at its entry tier and v0.3.0 is AGPL-3.0, while ImageKit offers a much broader media platform.',
  verdict:
    "If you want an all-in-one media platform — upload widgets, a media library your marketing team can browse, video streaming, and a free tier under 20 GB/month — ImageKit is the better product. Keenpix deliberately does none of that. Pick Keenpix if your images already live on origins you control and you need optimization and delivery with predictable costs: the same $9 entry buys 100 GB instead of 40 GB, overage is $0.07–0.12/GB, and paid delivery stays online. Published v0.3.0 also provides an AGPL-3.0 self-host path. Keenpix is younger and solo-built — weigh that honestly against ImageKit's maturity.",
  pricingRows: [
    {
      scenario: '20 GB delivered / month',
      competitor: '$0 (Free — stops serving past 20 GB)',
      keenpix: '$9 (Basic; no free cloud tier)',
    },
    {
      scenario: '40 GB delivered / month',
      competitor: '$9 (Lite — quota fully used)',
      keenpix: '$9 (Basic — 60 GB headroom left)',
    },
    {
      scenario: '100 GB delivered / month',
      competitor: '$39 (Lite + 60 GB × $0.50)',
      keenpix: '$9 (Basic — included)',
    },
    {
      scenario: '400 GB delivered / month',
      competitor: '~$168 (Pro $89 + 175 GB × $0.45)',
      keenpix: '$29 (Pro — included)',
    },
    {
      scenario: '1 TB delivered / month',
      competitor: '~$438 (Pro $89 + 775 GB × $0.45)',
      keenpix: '$69 (Business — included)',
    },
  ],
  featureRows: [
    {
      feature: 'Entry paid plan',
      competitor: '$9/mo · 40 GB bandwidth',
      keenpix: '$9/mo · 100 GB managed delivery',
    },
    {
      feature: 'Overage rate',
      competitor: '$0.45–0.50/GB',
      keenpix: '$0.07–0.12/GB',
    },
    {
      feature: 'Free tier',
      competitor: '20 GB/mo — serving stops when exceeded',
      keenpix: 'None — 14-day trial (card required)',
    },
    {
      feature: 'Billing meters',
      competitor: 'Bandwidth + storage',
      keenpix: 'Delivered bandwidth only — one meter',
    },
    {
      feature: 'Transformations',
      competitor: 'Unlimited',
      keenpix: 'Unlimited on every plan',
    },
    {
      feature: 'Team members',
      competitor: '3 on Lite; paid additions on Pro',
      keenpix: 'Unlimited on every paid plan',
    },
    {
      feature: 'When you hit the limit',
      competitor: 'Free plan: hard-stop mid-month',
      keenpix: 'Paid plans keep serving at the published overage rate',
    },
    {
      feature: 'Self-hosting',
      competitor: 'No',
      keenpix: 'v0.3.0: AGPL-3.0 with Docker/Coolify files',
    },
    {
      feature: 'Open source',
      competitor: 'No',
      keenpix: 'v0.3.0 source: AGPL-3.0; prior releases keep their licenses',
    },
    {
      feature: 'Storage / DAM',
      competitor: 'Yes — media library included',
      keenpix: 'No — serves from origins you already have',
    },
    {
      feature: 'Video',
      competitor: 'Yes — video API included',
      keenpix: 'No — images only',
    },
    {
      feature: 'Delivery analytics',
      competitor: 'Usage dashboard',
      keenpix: 'Every tier — cache hits, bandwidth saved, latency, live logs',
    },
    {
      feature: 'URL security',
      competitor: 'Signed URLs',
      keenpix:
        'No public keys — origin allowlists, SSRF-hardened, optional HMAC signing',
    },
    {
      feature: 'Works behind your CDN',
      competitor: 'Ships its own CDN',
      keenpix: 'Yes — designed to sit behind Cloudflare etc.',
    },
    {
      feature: 'Custom delivery domain',
      competitor: 'Yes (Pro and Enterprise; not Lite)',
      keenpix: 'Pro: 1 · Business: 10',
    },
  ],
  switchReasons: [
    {
      title: '2.5x the managed delivery for the same $9',
      detail:
        'ImageKit Lite and Keenpix Basic both cost $9/month, but Lite includes 40 GB while Basic includes 100 GB of managed delivery. Both count optimized CDN delivery, including provider-cache hits.',
    },
    {
      title: 'Published overage below ImageKit Lite',
      detail:
        'Past your quota, ImageKit charges $0.45–0.50 per GB. Keenpix Basic charges $0.12/GB, so a 60 GB overrun is $7.20 instead of $30 on ImageKit Lite.',
    },
    {
      title: 'Visible usage and a published overage rate',
      detail:
        'ImageKit documents a 20 GB free-plan delivery allowance and an account-level usage limit; confirm the current enforcement and notification behavior for your account. Keenpix paid plans keep serving at the published overage rate and surface projected charges in billing.',
    },
    {
      title: 'One meter, no storage bill',
      detail:
        'Keenpix transforms from origins you already run — S3, R2, or your own server — so there is nothing to upload and no asset-storage line item. Billing meters optimized managed delivery once across the edge and application.',
    },
    {
      title: 'Self-hosting is the exit ramp',
      detail:
        'The published v0.3.0 release is licensed AGPL-3.0 and includes Docker and Coolify deployment files. Moving in-house avoids a Keenpix license fee but transfers infrastructure, updates, monitoring, and routing to you.',
    },
  ],
  whenCompetitorWins: [
    'You want a media library / DAM: uploading, organizing, tagging, and letting non-developers browse assets. Keenpix has no storage at all — that is a deliberate omission, but it is an omission.',
    'You need video. ImageKit ships video transformation and streaming; Keenpix is images only.',
    "You stay under 20 GB/month and want genuinely free managed hosting. ImageKit's free tier costs $0 forever; Keenpix cloud starts at $9 after a 14-day trial (self-hosting is the free option).",
    'You need ImageKit’s DAM, upload, and media-management workflow in addition to delivery.',
    'You want a mature product with a full team, established support operations, and a broader media platform; Keenpix is a young, solo-founder product.',
  ],
  migrationSteps: [
    'Create a Keenpix project and allowlist your origin hosts (the S3 bucket, R2 bucket, or server your images live on). There are no public API keys to embed or rotate — the allowlist is the security boundary.',
    "If your images exist only inside ImageKit's media library, copy them to an origin you control first. Keenpix delivers from your origins; it does not store files.",
    "Map the URL grammar: ImageKit's path transforms like ik.imagekit.io/<id>/tr:w-400,q-80,f-auto/hero.jpg become https://cdn.keenpix.com/p/<project-id>/img/<origin-url>?w=400&q=80. Format selection (AVIF/WebP) is negotiated automatically — add &fmt= only to force one.",
    'Swap your image helper or component to emit Keenpix URLs behind a flag, and run both services side by side during the 14-day trial. The analytics dashboard shows output sizes, format mix, and cache hit rate to compare against your ImageKit bill.',
    'Use the managed Keenpix delivery hostname or custom domain so Cloudflare edge and application delivery are attributed once. A separate customer-owned CDN can still sit in front when you want to operate that cache yourself.',
    'Review projected overage and, if your transforms should not be publicly enumerable, enable HMAC signed URLs.',
    'After a week of clean analytics, remove the ImageKit URLs, or self-host a released Keenpix version if its measured operational cost and responsibilities fit your team.',
  ],
  faq: [
    {
      q: 'Is Keenpix actually cheaper than ImageKit?',
      a: "For paid delivery, yes, and it compounds with volume: $9 buys 100 GB vs 40 GB, and overage is $0.07–0.12/GB versus ImageKit's $0.45–0.50/GB (as of August 2026). At 400 GB/month Keenpix Pro is $29 versus roughly $168 on ImageKit. But if you deliver under 20 GB/month and can tolerate the hard-stop, ImageKit's free tier costs $0 and Keenpix cloud does not have a free tier.",
    },
    {
      q: 'Does Keenpix include storage or a media library like ImageKit?',
      a: 'No, and it never will by design. Keenpix optimizes and delivers from origins you already have — your bucket, your server. If you need upload pipelines, tagging, and a browsable asset library, ImageKit is the better fit.',
    },
    {
      q: 'Can Keenpix handle video?',
      a: 'No. Keenpix is images only, with documented resize, crop, quality, format negotiation, and image modifiers. If video is core to your product, keep ImageKit or a dedicated video service alongside.',
    },
    {
      q: 'What happens when I exceed my bandwidth quota?',
      a: "Overage bills at the subscribed plan rate: $0.12/$0.09/$0.07 per GB on Basic/Pro/Business. Paid delivery continues through the billing period, usage alerts and projected charges remain visible, and payment issues receive a dunning grace period. Compare ImageKit's free-tier behavior separately.",
    },
    {
      q: 'Can I self-host Keenpix?',
      a: 'The published v0.3.0 release is AGPL-3.0 and includes Docker/Coolify deployment files. Self-hosting has no Keenpix license fee, but you own infrastructure, updates, monitoring, and routing.',
    },
    {
      q: 'Do I have to re-upload my images to migrate?',
      a: "Only if they live exclusively in ImageKit's media library — then copy them to storage you control first. If your images are already on your own origin, migration is a URL rewrite: tr:w-400,f-auto path segments become ?w=400 query params, and format negotiation happens automatically.",
    },
  ],
  sources: [
    { label: 'ImageKit plans', url: 'https://imagekit.io/plans' },
    {
      label: 'ImageKit pricing documentation',
      url: 'https://imagekit.io/docs/how-pricing-works',
    },
    { label: 'Keenpix pricing', url: '/pricing' },
  ],
  pricingAsOf: 'August 2026',
  reviewer: 'Raed Bahri, Keenpix founder and maintainer',
  verifiedAt: '2026-08-05',
  nextReviewAt: '2026-10-12',
} satisfies ComparisonPageData
