import type { ComparisonPageData } from '../comparison-data'

export const cloudinaryComparison = {
  slug: 'cloudinary-alternative',
  competitor: 'Cloudinary',
  title: 'Cloudinary Alternative: Keenpix vs Cloudinary (2026)',
  metaDescription:
    'Keenpix vs Cloudinary (August 2026): pooled credits vs one managed-delivery meter. Honest pricing, migration steps, and when each wins.',
  heroHeadline: 'Keenpix vs Cloudinary: a focused image CDN alternative',
  heroSubhead:
    'Cloudinary bundles transformations, storage, and bandwidth into credits. Keenpix bills exactly one thing: optimized bytes delivered through managed cloud, with unlimited transforms and team members plus always-on paid overage.',
  verdict:
    'If you need video transcoding, a full digital asset manager, or AI-powered transforms today, pick Cloudinary — its breadth is real and Keenpix AI extensions are only coming soon. If what you use Cloudinary for is resizing and delivering images, Keenpix offers one managed-delivery meter, unlimited transformations and team members, managed custom domains, always-on paid usage, and an AGPL-3.0 v0.3.0 self-host path. Be aware of what you give up: Keenpix is a young solo-founder product with no video or storage. As of August 2026, 400 GB/month is $29 at Keenpix; Cloudinary bandwidth draws from the Advanced plan’s pooled credits alongside transforms and storage.',
  pricingRows: [
    {
      scenario: 'Credits → GB translation',
      competitor:
        '1 credit = 1 GB bandwidth OR 1k transforms OR 1 GB storage, one pool',
      keenpix: 'No translation — 1 GB managed delivery is 1 GB metered',
    },
    {
      scenario: '100 GB delivered / month',
      competitor: '$99/mo Plus — 100 of 225 credits gone before any transforms',
      keenpix: '$9/mo Basic',
    },
    {
      scenario: '400 GB delivered / month',
      competitor: "$249/mo Advanced — Plus's 225 credits can't cover it",
      keenpix: '$29 Pro',
    },
    {
      scenario: '1 TB delivered / month',
      competitor: "Custom/enterprise — past Advanced's 600 credits",
      keenpix: '$69 Business',
    },
    {
      scenario: 'Effective cost per GB',
      competitor: '~$0.44 per credit-GB on Plus',
      keenpix: 'Plan effective rate varies; overage $0.07–0.12',
    },
    {
      scenario: 'The month you exceed the plan',
      competitor:
        'Cloudinary documents soft limits and contacts customers about upgrading',
      keenpix: 'Linear overage; paid delivery continues',
    },
  ],
  featureRows: [
    {
      feature: 'Billing model',
      competitor: 'Pooled credits (transforms + storage + GB)',
      keenpix: 'One meter: optimized managed delivery',
    },
    {
      feature: 'Transformations',
      competitor: 'Metered — 1 credit per 1,000',
      keenpix: 'Unlimited on every plan',
    },
    {
      feature: 'Entry paid plan',
      competitor: '$99/mo · 225 pooled credits ($89 annual)',
      keenpix: '$9/mo · 100 GB managed delivery (both pricing phases)',
    },
    {
      feature: 'Overage handling',
      competitor: 'Soft limits; plan upgrade or custom terms may be required',
      keenpix: 'Linear $0.07–0.12/GB',
    },
    {
      feature: 'Paid overage behavior',
      competitor: 'Soft limits; plan changes or custom terms may apply',
      keenpix: 'Always on at the published per-GB rate',
    },
    {
      feature: 'Self-hosting',
      competitor: 'No',
      keenpix: 'v0.3.0: AGPL-3.0 with Docker deployment files',
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
      keenpix: 'Coming soon; separate transparent meter planned',
    },
    {
      feature: 'Custom domain (CNAME)',
      competitor: 'Advanced plan ($249/mo) and up',
      keenpix: 'Pro: 1 · Business: 10',
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
        'Cloudinary credits cover transformations, storage, and bandwidth at different rates, so forecasting needs all three dimensions. Keenpix meters optimized managed delivery once across Cloudflare edge hits and application responses.',
    },
    {
      title: 'Published linear overage instead of a pooled estimate',
      detail:
        'Cloudinary documents its plan limits as soft limits and says it contacts customers about upgrading. Keenpix bills linear per-GB overage while paid delivery continues, with usage alerts and projected charges visible during the billing period.',
    },
    {
      title: 'Unlimited transformations make optimizing free',
      detail:
        'Every Keenpix plan includes unlimited transforms, so adding AVIF variants, tighter responsive breakpoints, or art-directed crops costs nothing extra. On Cloudinary each of those experiments consumes credits from the same pool that pays for your bandwidth. Optimize aggressively without watching a meter.',
    },
    {
      title: 'An open-source escape hatch',
      detail:
        'The published v0.3.0 release is AGPL-3.0 and includes Docker/Coolify deployment files. Moving in-house still requires infrastructure, operations, and a hostname/routing plan. Cloudinary has no self-host path.',
    },
    {
      title: 'Core analytics on every Keenpix tier',
      detail:
        'Bandwidth saved, cache hit rate, format mix, top images, latency percentiles, and live request logs are included on every Keenpix tier. You should not need a sales call to find out what your images are doing.',
    },
  ],
  whenCompetitorWins: [
    'You need video transcoding, adaptive streaming, or video AI — Keenpix is images only.',
    'You want a full DAM: upload pipelines, asset workflows, approvals, team libraries. Keenpix has no storage at all.',
    'You rely on AI transforms like auto-tagging, background removal, or generative fill.',
    'You need Cloudinary’s DAM, video, upload, and AI-media tooling in one platform.',
    'You want a large, battle-tested vendor with a huge SDK ecosystem and enterprise support; Keenpix is a young, solo-founder product.',
  ],
  migrationSteps: [
    'Leave your assets where they are. Keenpix has no storage, so originals stay in S3, R2, your own server — or even in Cloudinary storage, used purely as an origin. You are only replacing the transform-and-delivery layer.',
    'Create a Keenpix project and allowlist your origin hosts (e.g. your-bucket.s3.amazonaws.com or res.cloudinary.com). Per-project allowlists replace public API keys entirely.',
    "Translate URLs: https://res.cloudinary.com/<cloud>/image/upload/w_800,q_75/photo.jpg becomes https://cdn.keenpix.com/p/<project-id>/img/<origin-url>?w=800&q=75. Cloudinary's f_auto needs no parameter — AVIF/WebP negotiation is automatic. c_fill,w_800,h_600 maps to w=800&h=600&fit=cover.",
    "Swap URL generation in code with a small helper or your framework's image loader. Common resize, crop, quality, and format parameters have documented Keenpix equivalents; test every modifier your application uses before switching.",
    'Use the managed Keenpix delivery hostname or custom domain so edge and application delivery are attributed once. You can place a customer-owned CDN in front when you want to operate an additional cache layer.',
    'Optionally enable HMAC signed URLs on hotlink-sensitive routes.',
    'Run both side by side through the 14-day trial, watch cache hit rate, projected usage cost, and bandwidth-saved analytics, then plan a canary cutover with the required URL or hostname routing changes.',
  ],
  faq: [
    {
      q: 'How do Cloudinary credits translate to gigabytes?',
      a: 'One credit buys 1 GB of bandwidth, 1,000 transformations, or 1 GB of managed storage — all drawn from a single pool. Plus ($99/mo) includes 225 credits, so 225 GB delivered is the theoretical maximum if you spend zero credits on transforms and storage; real delivery is always less. Keenpix instead publishes one plan price plus one delivered-GB overage rate per plan.',
    },
    {
      q: 'What happens when I hit my plan limit?',
      a: "Cloudinary describes its plan limits as soft limits and says it contacts customers about upgrading to a plan that better fits their usage. Keenpix bills $0.07–0.12/GB, keeps paid delivery online, and charges accumulated overage at the end of the billing period. Confirm either service's current terms before relying on a failure mode.",
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
      a: 'The published v0.3.0 release provides the engine under AGPL-3.0 and includes the transform pipeline, caching, and analytics. Self-hosting still requires your own infrastructure and operations.',
    },
    {
      q: 'Is there a free tier?',
      a: 'The managed cloud has a 14-day free trial (card required), with plans starting at $9/month for 100 GB of optimized managed delivery. A released open-source version can be self-hosted without a Keenpix license fee, but you pay for and operate the infrastructure.',
    },
  ],
  sources: [
    { label: 'Cloudinary pricing', url: 'https://cloudinary.com/pricing' },
    {
      label: 'Cloudinary credit documentation',
      url: 'https://cloudinary.com/documentation/developer_onboarding_faq_credits',
    },
    { label: 'Cloudinary plan-limit FAQ', url: 'https://cloudinary.com/faq' },
    { label: 'Keenpix pricing', url: '/pricing' },
  ],
  pricingAsOf: 'August 2026',
  reviewer: 'Raed Bahri, Keenpix founder and maintainer',
  verifiedAt: '2026-08-05',
  nextReviewAt: '2026-10-12',
} satisfies ComparisonPageData
