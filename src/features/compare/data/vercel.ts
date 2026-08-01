import type { ComparisonPageData } from '../comparison-data'

export const vercelComparison = {
  slug: 'vercel-image-optimization-alternative',
  competitor: 'Vercel Image Optimization',
  title: 'Vercel Image Optimization Alternative: Keenpix (2026)',
  metaDescription:
    'Keenpix vs Vercel Image Optimization: one meter vs three, unlimited transforms, next/image loader support, and always-on paid usage. Pricing as of July 2026.',
  heroHeadline: 'Keenpix vs Vercel Image Optimization: a portable alternative',
  heroSubhead:
    'Vercel Image Optimization bills transformations, cache reads, and cache writes — plus data transfer — and Hobby can return 402 at its included limits. Keenpix bills optimized response bytes returned by the application; paid usage continues at the published overage rate. Upstream CDN edge hits do not reach the Keenpix meter.',
  verdict:
    "If your site fits inside Vercel's Hobby allowances, or you already pay for Vercel Pro and image usage costs little, stay put — the default next/image loader is zero-config and Keenpix cannot beat free or nearly-free. Consider Keenpix when you prefer one bandwidth meter, image-specific analytics, managed custom domains, always-on paid usage, and the upcoming v0.2.0 AGPL-3.0 self-host path. Keenpix is a young, focused product with no video or storage, so the trade is portability and predictability for platform breadth and maturity.",
  pricingRows: [
    {
      scenario: 'Small site within Hobby caps (<5k transforms/mo)',
      competitor: 'Free — hard 402 the moment any cap is hit',
      keenpix: '$9/mo Basic — no free tier, 14-day trial',
    },
    {
      scenario: 'Content site: 5k images × 3 sizes, ~30 GB/mo',
      competitor:
        'Hobby: blocked (15k transforms vs 5k cap) · Pro: $20 seat + ~$1–2 metered',
      keenpix: '$9/mo Basic — 100 GB included',
    },
    {
      scenario: '400 GB delivered / month',
      competitor:
        'Pro: transforms + cache reads + cache writes + Fast Data Transfer — varies',
      keenpix: '$19/mo Pro — 400 GB included, then $0.06/GB',
    },
    {
      scenario: '1 TB delivered / month',
      competitor:
        "Pro metered usage + Fast Data Transfer at Vercel's regional rates",
      keenpix: '$39/mo Business — 1 TB included, then $0.05/GB',
    },
    {
      scenario: 'Crawler spike: 3× unique widths requested',
      competitor:
        'Extra transforms + cache writes billed; Hobby can 402 mid-month',
      keenpix:
        '$0 extra unless delivered GB rises; published overage after that',
    },
  ],
  featureRows: [
    {
      feature: 'Billing meters',
      competitor: '3 (transforms, cache reads, cache writes) + data transfer',
      keenpix: '1 — application response bytes',
    },
    {
      feature: 'Transformations',
      competitor: '5k/mo free (Hobby); $0.05–$0.0812 per 1k (Pro)',
      keenpix: 'Unlimited on every plan',
    },
    {
      feature: 'Cache reads / writes',
      competitor: 'Metered: $0.40–0.64/1M reads, $4.00–6.40/1M writes',
      keenpix: 'Not billed — disk + memory cache with stale-while-revalidate',
    },
    {
      feature: 'Behavior at limits',
      competitor: 'Hobby: hard 402 — images break',
      keenpix: 'Paid usage stays online; dunning grace for payment failures',
    },
    {
      feature: 'next/image support',
      competitor: 'Default loader, zero config',
      keenpix: 'Custom loader — a few lines (snippet in docs)',
    },
    {
      feature: 'Works outside Next.js',
      competitor: 'Vercel-hosted frameworks',
      keenpix: 'Any stack — plain URL API',
    },
    {
      feature: 'AVIF / WebP auto-negotiation',
      competitor: 'Yes',
      keenpix: 'Yes — via Accept header',
    },
    {
      feature: 'Image analytics',
      competitor: 'Usage/billing metrics',
      keenpix:
        'Bandwidth saved, cache hit rate, format mix, latency percentiles, live logs — every tier',
    },
    {
      feature: 'Open source / self-host',
      competitor: 'No — managed service',
      keenpix: 'Upcoming v0.2.0: AGPL-3.0 with Docker deployment files',
    },
    {
      feature: 'Security model',
      competitor: 'Tied to your Vercel project',
      keenpix:
        'No public API keys — origin allowlists, SSRF-hardened, optional HMAC signed URLs',
    },
    {
      feature: 'Use your existing CDN',
      competitor: 'No — Vercel edge only',
      keenpix: 'Yes — designed to sit behind Cloudflare etc.',
    },
    {
      feature: 'Serve from your own domain',
      competitor: "Yes — your app's domain",
      keenpix: 'Not yet',
    },
    {
      feature: 'Video / storage / DAM',
      competitor: 'No',
      keenpix: 'No',
    },
  ],
  switchReasons: [
    {
      title: 'One meter you can actually forecast',
      detail:
        "Vercel's image pricing has changed shape twice — legacy $5 per 1k source images, now three usage meters plus Fast Data Transfer. Predicting next month's bill means forecasting four line items that move independently. Keenpix bills delivered gigabytes, full stop: one number, one published overage rate.",
    },
    {
      title: 'Unlimited transformations, so srcsets are free',
      detail:
        "Responsive srcsets, DPR variants, and format experiments multiply unique transformations — the exact meter that breaks Hobby's 5k cap. On Keenpix every transform is free on every plan, so serving 3 sizes or 8 costs the same. Only the bytes you deliver are billed.",
    },
    {
      title: 'Paid usage stays online instead of returning a 402',
      detail:
        'When Vercel Hobby hits a cap, images can stop rendering with a hard 402. Keenpix paid plans continue serving at the published per-GB rate, show projected overage, and give payment hiccups a dunning grace period rather than an instant cutoff.',
    },
    {
      title: 'Analytics that answer image questions',
      detail:
        'Vercel shows you usage numbers for billing. Keenpix shows bandwidth saved, cache hit rate, format mix, top images, latency percentiles, and live request logs — at every tier, including the $9 plan. When a crawler hammers odd widths, you can see it happening.',
    },
    {
      title: 'An open-source escape hatch',
      detail:
        'The v0.2.0 cloud code is AGPL-3.0 and includes a Docker deployment path. The latest published v0.1.11 release remains Apache-2.0 until v0.2.0 is tagged. Moving from hosted Keenpix to self-hosting can preserve the transform grammar when you control routing, but it still requires an operational migration.',
    },
  ],
  whenCompetitorWins: [
    "Your image usage fits Hobby's free allowances (under 5k transformations, 300k cache reads, 100k cache writes a month) — free beats $9.",
    'You already pay for Vercel Pro and your image meters total a dollar or two a month — the incremental cost undercuts Keenpix Basic.',
    'You want zero configuration: the default next/image loader needs no loader file, no second dashboard, no extra vendor.',
    'You want image optimization embedded directly into the rest of your Vercel bill and deployment workflow.',
    'You value one vendor for hosting, preview deploys, and images, with a single bill and a single support channel.',
  ],
  migrationSteps: [
    'Start a Keenpix project (14-day trial, card required) and add your image origin hostnames to the per-project allowlist — there are no public API keys to create or rotate.',
    "Copy the loader snippet from /docs/frameworks/nextjs into image-loader.ts and set images.loaderFile in next.config — next/image keeps working unchanged, and Vercel's optimizer is bypassed automatically.",
    'For a custom Next.js loader, src becomes /img/<origin-url>, width maps to ?w=, and quality maps to ?q=; add your project id as ?project=. Validate any additional application-specific transforms in a preview deployment.',
    'Leave format selection automatic — Keenpix negotiates AVIF/WebP from the Accept header — or pin an output with ?fmt= where you need it.',
    'Deploy a preview and confirm traffic in Keenpix live request logs, then route the image path through your existing CDN (e.g. Cloudflare) so edge caching stays free — Keenpix is designed to sit behind it.',
    'Compare the single bandwidth meter and projected overage against your Vercel usage page during the trial.',
    'Optionally enable HMAC signed URLs to lock transform parameters before going to production.',
  ],
  faq: [
    {
      q: 'Does Keenpix work with next/image?',
      a: "Yes. Next.js supports custom loaders via images.loaderFile, and Keenpix's docs (/docs/frameworks/nextjs) include a ready-made snippet. Your components keep using next/image exactly as before — the loader just rewrites URLs to Keenpix's /img/ endpoint with ?w= and ?q= mapped from next/image's width and quality props.",
    },
    {
      q: 'What would a 5,000-image content site actually cost on each?',
      a: "Take 5,000 source images served in 3 responsive sizes (15,000 unique transformations) with ~300k image requests and ~30 GB delivered a month. On Vercel Hobby that site is blocked — 15k transforms is triple the 5k cap, and 300k requests sits at the cache-read cap, so images 402 mid-month. On Vercel Pro it's the $20/mo seat plus roughly $1–2 of metered usage (transforms at $0.05–$0.0812/1k, reads at $0.40–0.64/1M, writes at $4.00–6.40/1M) — cheap on average, but each meter scales independently. On Keenpix it's $9/mo flat: 30 GB fits well inside Basic's 100 GB, and transformations are unlimited. Honest caveat: if you're already paying for Pro anyway, the incremental image cost there can be under $9 — Keenpix wins on predictability, caps, and analytics, not always on raw dollars.",
    },
    {
      q: 'What happens when I hit a limit?',
      a: 'On Vercel Hobby, crossing an included image limit can return a hard 402. Keenpix paid plans continue serving at their published per-GB overage rate, while payment issues trigger a dunning grace period rather than an instant cutoff.',
    },
    {
      q: 'Do I have to move my app off Vercel?',
      a: "No. Keenpix only replaces the image optimization layer — your app, deploys, and previews stay on Vercel. Many teams pair free Hobby hosting with Keenpix precisely because it's the image meters, not the hosting, that force the Pro upgrade.",
    },
    {
      q: 'Why do LLM crawlers make Vercel image bills unpredictable?',
      a: "Crawlers request image URLs at widths and combinations real users never hit, and every new variant is a fresh transformation plus a cache write — two billed meters on Vercel, and the fastest way to blow through Hobby's 5k-transform cap. On Keenpix transformations are free, so crawler traffic only costs the bandwidth it actually pulls; signed URLs and origin allowlists help prevent abusive variants.",
    },
    {
      q: 'Can I self-host Keenpix?',
      a: 'The upcoming v0.2.0 code is AGPL-3.0 and includes Docker/Coolify deployment files; the latest published v0.1.11 remains Apache-2.0 until v0.2.0 is tagged. Self-hosting has no Keenpix license fee, but you own infrastructure and routing.',
    },
  ],
  sources: [
    { label: 'Vercel pricing', url: 'https://vercel.com/pricing' },
    {
      label: 'Vercel image cost guidance',
      url: 'https://examples.vercel.com/docs/image-optimization/managing-image-optimization-costs',
    },
    {
      label: 'Vercel image pricing changelog',
      url: 'https://vercel.com/changelog/faster-transformations-and-reduced-pricing-for-image-optimization-4h2m8digJ84goyF69n5jUi',
    },
    { label: 'Keenpix pricing', url: '/pricing' },
  ],
  pricingAsOf: 'July 2026',
  reviewer: 'Raed Bahri, Keenpix founder and maintainer',
  verifiedAt: '2026-07-12',
  nextReviewAt: '2026-10-12',
} satisfies ComparisonPageData
