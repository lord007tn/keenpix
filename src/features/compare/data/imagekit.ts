import type { ComparisonPageData } from '../comparison-data'

export const imagekitComparison = {
  slug: 'imagekit-alternative',
  competitor: 'ImageKit',
  title: 'ImageKit Alternative: Keenpix vs ImageKit (2026)',
  metaDescription:
    'Keenpix vs ImageKit, July 2026: same $9 entry but 100 GB vs 40 GB, $0.08 vs $0.50/GB overage, AGPL self-hosting — and where ImageKit still wins.',
  heroHeadline: 'Keenpix vs ImageKit: a bandwidth-first alternative',
  heroSubhead:
    'ImageKit and Keenpix both publish bandwidth-based pricing. Keenpix bundles more bandwidth at its entry tier and the upcoming v0.2.0 code is AGPL-3.0, while ImageKit offers a much broader media platform.',
  verdict:
    "If you want an all-in-one media platform — upload widgets, a media library your marketing team can browse, video streaming, and a free tier under 20 GB/month — ImageKit is the better product. Keenpix deliberately does none of that. Pick Keenpix if your images already live on origins you control and you need optimization and delivery with predictable costs: the same $9 entry buys 100 GB instead of 40 GB, published overage runs $0.05–0.08/GB, and a spend cap is on by default. The upcoming v0.2.0 code also provides an AGPL-3.0 self-host path. Keenpix is younger and solo-built — weigh that honestly against ImageKit's maturity.",
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
      keenpix: '$19 (Pro — included)',
    },
    {
      scenario: '1 TB delivered / month',
      competitor: '~$438 (Pro $89 + 775 GB × $0.45)',
      keenpix: '$29 (Business — included)',
    },
  ],
  featureRows: [
    {
      feature: 'Entry paid plan',
      competitor: '$9/mo · 40 GB bandwidth',
      keenpix: '$9/mo · 100 GB returned by Keenpix',
    },
    {
      feature: 'Overage rate',
      competitor: '$0.45–0.50/GB',
      keenpix: '$0.05–0.08/GB',
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
      feature: 'When you hit the limit',
      competitor: 'Free plan: hard-stop mid-month',
      keenpix: 'Pauses at your cap (~2x plan, adjustable, on by default)',
    },
    {
      feature: 'Self-hosting',
      competitor: 'No',
      keenpix: 'Upcoming v0.2.0: AGPL-3.0 with Docker/Coolify files',
    },
    {
      feature: 'Open source',
      competitor: 'No',
      keenpix: 'v0.2.0 source: AGPL-3.0; prior releases keep their licenses',
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
      keenpix: 'Not yet',
    },
  ],
  switchReasons: [
    {
      title: '2.5x the bandwidth for the same $9',
      detail:
        'ImageKit Lite and Keenpix Basic both cost $9/month, but Lite includes 40 GB while Basic includes 100 GB of responses returned by Keenpix. Compare the exact meter boundaries and your cache behavior; annual Keenpix billing costs ten monthly payments.',
    },
    {
      title: 'Overage at $0.08/GB, not $0.50/GB',
      detail:
        'Past your quota, ImageKit charges $0.45–0.50 per GB — roughly 50x the wholesale cost of bandwidth. Keenpix charges $0.08/GB on Basic, dropping to $0.05/GB on Business. A 60 GB overrun costs $30 on ImageKit Lite and $4.80 on Keenpix Basic.',
    },
    {
      title: 'A cap you set instead of a meter you fear',
      detail:
        'ImageKit documents a 20 GB free-plan delivery allowance and an account-level usage limit; confirm the current enforcement and notification behavior for your account. Keenpix ships a hard spend cap, on by default at roughly 2x your plan price, so delivery pauses at a number you chose.',
    },
    {
      title: 'One meter, no storage bill',
      detail:
        'Keenpix transforms from origins you already run — S3, R2, or your own server — so there is nothing to upload and no asset-storage line item. Billing meters optimized response bytes returned by Keenpix; upstream CDN edge hits do not reach that meter.',
    },
    {
      title: 'Self-hosting is the exit ramp',
      detail:
        'The v0.2.0 cloud code is licensed AGPL-3.0 and includes Docker and Coolify deployment files. The latest published v0.1.11 release remains Apache-2.0 until v0.2.0 is tagged. Moving in-house avoids a Keenpix license fee but transfers infrastructure, updates, monitoring, and routing to you.',
    },
  ],
  whenCompetitorWins: [
    'You want a media library / DAM: uploading, organizing, tagging, and letting non-developers browse assets. Keenpix has no storage at all — that is a deliberate omission, but it is an omission.',
    'You need video. ImageKit ships video transformation and streaming; Keenpix is images only.',
    "You stay under 20 GB/month and want genuinely free managed hosting. ImageKit's free tier costs $0 forever; Keenpix cloud starts at $9 after a 14-day trial (self-hosting is the free option).",
    'You need a custom delivery domain today. ImageKit offers it on paid plans; Keenpix does not yet.',
    'You want a mature product with a full team, established support operations, and a broader media platform; Keenpix is a young, solo-founder product.',
  ],
  migrationSteps: [
    'Create a Keenpix project and allowlist your origin hosts (the S3 bucket, R2 bucket, or server your images live on). There are no public API keys to embed or rotate — the allowlist is the security boundary.',
    "If your images exist only inside ImageKit's media library, copy them to an origin you control first. Keenpix delivers from your origins; it does not store files.",
    "Map the URL grammar: ImageKit's path transforms like ik.imagekit.io/<id>/tr:w-400,q-80,f-auto/hero.jpg become keenpix query params: /img/<origin-url>?project=<id>&w=400&q=80. Format selection (AVIF/WebP) is negotiated automatically — add &fmt= only to force one.",
    'Swap your image helper or component to emit Keenpix URLs behind a flag, and run both services side by side during the 14-day trial. The analytics dashboard shows output sizes, format mix, and cache hit rate to compare against your ImageKit bill.',
    'Keep (or add) your CDN in front — Keenpix is designed to sit behind Cloudflare or any edge cache, so repeat hits never touch the meter.',
    'Set your spend cap (it defaults to ~2x plan price) and, if your transforms should not be publicly enumerable, enable HMAC signed URLs.',
    'After a week of clean analytics, remove the ImageKit URLs, or self-host a released Keenpix version if its measured operational cost and responsibilities fit your team.',
  ],
  faq: [
    {
      q: 'Is Keenpix actually cheaper than ImageKit?',
      a: "For paid delivery, yes, and it compounds with volume: $9 buys 100 GB vs 40 GB, and overage is $0.05–0.08/GB vs $0.45–0.50/GB (as of July 2026). At 400 GB/month that is $19 vs roughly $168. But if you deliver under 20 GB/month and can tolerate the hard-stop, ImageKit's free tier costs $0 and Keenpix cloud does not have a free tier.",
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
      a: "Overage bills at your plan's per-GB rate ($0.08 on Basic down to $0.05 on Business) until you hit your spend cap, which is on by default at roughly 2x your plan price — then delivery pauses. You choose the cap, and payment issues never instantly cut delivery. Compare ImageKit's free tier, which stops serving images mid-month with no cap to raise.",
    },
    {
      q: 'Can I self-host Keenpix?',
      a: 'The upcoming v0.2.0 code is AGPL-3.0 and includes Docker/Coolify deployment files; the latest published v0.1.11 remains Apache-2.0 until v0.2.0 is tagged. Self-hosting has no Keenpix license fee, but you own infrastructure, updates, monitoring, and routing.',
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
  pricingAsOf: 'July 2026',
  reviewer: 'Raed Bahri, Keenpix founder and maintainer',
  verifiedAt: '2026-07-12',
  nextReviewAt: '2026-10-12',
} satisfies ComparisonPageData
