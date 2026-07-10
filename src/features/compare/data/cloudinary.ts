import type { ComparisonPageData } from '../comparison-data'

export const cloudinaryComparison = {
  slug: 'cloudinary-alternative',
  competitor: 'Cloudinary',
  title: 'Cloudinary Alternative: Keenpix vs Cloudinary (2026)',
  metaDescription:
    'Keenpix vs Cloudinary (July 2026): pooled credits vs one bandwidth meter with a hard cap you set. Honest pricing, migration steps, and when each wins.',
  heroHeadline: 'One honest meter instead of a credit pool',
  heroSubhead:
    'Cloudinary bundles transformations, storage, and bandwidth into credits — and suspends accounts that run out. Keenpix bills exactly one thing, GB delivered, with unlimited transforms and a hard spend cap you control.',
  verdict:
    'If you need video transcoding, a full digital asset manager, or AI-powered transforms, pick Cloudinary — its breadth is real and Keenpix does not pretend to match it. If what you actually use Cloudinary for is resizing and delivering images, and your monthly ritual is reverse-engineering a credit invoice, Keenpix does that one job with one meter, unlimited transformations, a spend cap you set, and an AGPL self-host escape hatch. Be aware of what you give up: Keenpix is a young solo-founder product with no video, no storage, and no custom domains yet. As of July 2026 the math is stark for delivery-heavy sites — 400 GB/month is $19 on Keenpix and requires the $249/mo Advanced tier on Cloudinary.',
  pricingRows: [
    {
      scenario: 'Credits → GB translation',
      competitor:
        '1 credit = 1 GB bandwidth OR 1k transforms OR 1 GB storage, one pool',
      keenpix: 'No translation — 1 GB delivered is 1 GB',
    },
    {
      scenario: '100 GB delivered / month',
      competitor: '$99/mo Plus — 100 of 225 credits gone before any transforms',
      keenpix: '$9/mo Basic',
    },
    {
      scenario: '400 GB delivered / month',
      competitor: "$249/mo Advanced — Plus's 225 credits can't cover it",
      keenpix: '$19/mo Pro',
    },
    {
      scenario: '1 TB delivered / month',
      competitor: "Custom/enterprise — past Advanced's 600 credits",
      keenpix: '$29/mo Business',
    },
    {
      scenario: 'Effective cost per GB',
      competitor: '~$0.44 per credit-GB on Plus',
      keenpix: '$0.03–0.09/GB by plan; overage $0.05–0.08/GB',
    },
    {
      scenario: 'The month you exceed the plan',
      competitor: 'No auto-overage on fixed tiers — account suspended',
      keenpix: 'Linear overage up to your cap, then delivery pauses',
    },
  ],
  featureRows: [
    {
      feature: 'Billing model',
      competitor: 'Pooled credits (transforms + storage + GB)',
      keenpix: 'One meter: GB delivered',
    },
    {
      feature: 'Transformations',
      competitor: 'Metered — 1 credit per 1,000',
      keenpix: 'Unlimited on every plan',
    },
    {
      feature: 'Entry paid plan',
      competitor: '$99/mo · 225 pooled credits ($89 annual)',
      keenpix: '$9/mo · 100 GB delivered',
    },
    {
      feature: 'Overage handling',
      competitor: 'None on fixed tiers — suspension at quota',
      keenpix: 'Linear $0.05–0.08/GB, hard-capped',
    },
    {
      feature: 'Spend cap',
      competitor: 'No',
      keenpix: 'Yes — on by default (~2x plan)',
    },
    {
      feature: 'Self-hosting',
      competitor: 'No',
      keenpix: 'Yes — AGPL-3.0, one-command Docker',
    },
    {
      feature: 'Analytics',
      competitor: 'Usage reports, plan-dependent',
      keenpix: 'Every tier: cache hits, latency, live logs',
    },
    {
      feature: 'API security',
      competitor: 'Public API key + secret model',
      keenpix: 'No public keys — origin allowlists + HMAC URLs',
    },
    {
      feature: 'Storage / DAM',
      competitor: 'Yes — full DAM included',
      keenpix: 'No — serves your existing origins',
    },
    {
      feature: 'Video',
      competitor: 'Yes — transcoding + streaming',
      keenpix: 'No',
    },
    {
      feature: 'AI features',
      competitor: 'Yes — tagging, gen fill, smart crop',
      keenpix: 'No',
    },
    {
      feature: 'Custom domain (CNAME)',
      competitor: 'Advanced plan ($249/mo) and up',
      keenpix: 'Not yet',
    },
    {
      feature: 'CDN',
      competitor: "Bundled (Cloudinary's edge)",
      keenpix: 'Sits behind your CDN (Cloudflare etc.)',
    },
    {
      feature: 'Modern formats',
      competitor: 'AVIF/WebP via f_auto',
      keenpix: 'AVIF/WebP negotiation built in',
    },
  ],
  switchReasons: [
    {
      title: 'One meter you can actually forecast',
      detail:
        'Cloudinary credits get drained by transformations, storage, and bandwidth at different rates, so a bot crawl or one extra srcset breakpoint quietly moves your bill. Keenpix meters delivered bandwidth and nothing else. Your invoice tracks your traffic — no pooled-credit math to reverse-engineer.',
    },
    {
      title:
        "Hitting a limit pauses on your terms — it doesn't suspend your account",
      detail:
        "Cloudinary's fixed tiers have no automatic overage: exceed the credit quota and the account gets suspended. Keenpix bills linear per-GB overage up to a hard cap you set, on by default at roughly 2x your plan price, and delivery pauses at the cap instead of surprising you. Payment hiccups get a dunning grace period, never an instant cutoff.",
    },
    {
      title: 'Unlimited transformations make optimizing free',
      detail:
        'Every Keenpix plan includes unlimited transforms, so adding AVIF variants, tighter responsive breakpoints, or art-directed crops costs nothing extra. On Cloudinary each of those experiments consumes credits from the same pool that pays for your bandwidth. Optimize aggressively without watching a meter.',
    },
    {
      title: 'An open-source escape hatch',
      detail:
        'The exact engine behind the managed cloud is AGPL-3.0 — self-host it free forever with a one-command Docker or Coolify install, no CLA, no rug-pull. If you ever leave the cloud for cost, compliance, or control, you keep your URLs and your pipeline. Cloudinary has no self-host path.',
    },
    {
      title: 'Real analytics at $9, not at enterprise',
      detail:
        'Bandwidth saved, cache hit rate, format mix, top images, latency percentiles, and live request logs are included on every Keenpix tier — the $9 plan sees the same core dashboards as the $29 one. You should not need a sales call to find out what your images are doing.',
    },
  ],
  whenCompetitorWins: [
    'You need video transcoding, adaptive streaming, or video AI — Keenpix is images only.',
    'You want a full DAM: upload pipelines, asset workflows, approvals, team libraries. Keenpix has no storage at all.',
    'You rely on AI transforms like auto-tagging, background removal, or generative fill.',
    "You need a custom delivery domain today — Cloudinary offers CNAME from Advanced ($249/mo); Keenpix doesn't offer custom domains yet.",
    'You want a large, battle-tested vendor with a huge SDK ecosystem and enterprise support; Keenpix is a young, solo-founder product.',
  ],
  migrationSteps: [
    'Leave your assets where they are. Keenpix has no storage, so originals stay in S3, R2, your own server — or even in Cloudinary storage, used purely as an origin. You are only replacing the transform-and-delivery layer.',
    'Create a Keenpix project and allowlist your origin hosts (e.g. your-bucket.s3.amazonaws.com or res.cloudinary.com). Per-project allowlists replace public API keys entirely.',
    "Translate URLs: https://res.cloudinary.com/<cloud>/image/upload/w_800,q_75/photo.jpg becomes https://keenpix.com/img/<origin-url>?project=<id>&w=800&q=75. Cloudinary's f_auto needs no parameter — AVIF/WebP negotiation is automatic. c_fill,w_800,h_600 maps to w=800&h=600&fit=cover.",
    "Swap URL generation in code with a small helper or your framework's image loader. Modifiers are IPX-parity, so Nuxt Image and IPX users can often keep their params unchanged.",
    'Keep your CDN in front. Keenpix is designed to sit behind Cloudflare (or any CDN), so cached edge hits never touch your Keenpix quota.',
    'Optionally enable HMAC signed URLs on hotlink-sensitive routes.',
    "Run both side by side through the 14-day trial, watch cache hit rate and bandwidth-saved analytics, set your spend cap, then cut over — it's only URL changes, no DNS.",
  ],
  faq: [
    {
      q: 'How do Cloudinary credits translate to gigabytes?',
      a: 'One credit buys 1 GB of bandwidth, 1,000 transformations, or 1 GB of managed storage — all drawn from a single pool. Plus ($99/mo) includes 225 credits, so 225 GB delivered is the theoretical maximum if you spend zero credits on transforms and storage; real delivery is always less. That works out to roughly $0.44 per credit-GB, versus $0.03–0.09/GB effective on Keenpix (as of July 2026).',
    },
    {
      q: 'What happens when I hit my plan limit?',
      a: "On Cloudinary's fixed tiers there is no automatic overage — exceed your credit quota and the account can be suspended. On Keenpix you pay a published linear rate ($0.05–0.08/GB by plan) up to a hard spend cap you set, on by default at roughly 2x your plan price. At the cap, delivery pauses instead of billing you more — your choice, not the vendor's.",
    },
    {
      q: 'Do I have to migrate my images out of Cloudinary?',
      a: 'No. Keenpix has no storage — it fetches from origins you allowlist and handles transformation and delivery. You can keep originals in S3, R2, your own server, or even in Cloudinary storage during the transition, and move them later (or never).',
    },
    {
      q: 'Does Keenpix handle video or DAM workflows?',
      a: 'No. Keenpix is deliberately an image optimization and delivery layer. If video transcoding or a full digital asset manager is core to your workflow, Cloudinary is the better fit today.',
    },
    {
      q: 'Is the self-hosted version feature-limited?',
      a: 'No. The AGPL-3.0 self-host engine is the same code that powers the managed cloud — sharp transforms, AVIF/WebP negotiation, caching, analytics. One-command Docker or Coolify install, free forever, no CLA, no open-core split to worry about.',
    },
    {
      q: 'Is there a free tier?',
      a: 'The managed cloud has a 14-day free trial (card required) — plans start at $9/mo for 100 GB delivered. If you want free forever, self-host the open-source engine on your own infrastructure.',
    },
  ],
  pricingAsOf: 'July 2026',
} satisfies ComparisonPageData
