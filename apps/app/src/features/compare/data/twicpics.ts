import type { ComparisonPageData } from '../comparison-data'

export const twicpicsComparison = {
  slug: 'twicpics-alternative',
  competitor: 'TwicPics',
  title: 'TwicPics Alternative: Keenpix vs TwicPics (2026)',
  metaDescription:
    'Keenpix vs TwicPics (August 2026): compare bandwidth pricing, responsive-media tooling, video, migration work, operations, and self-hosting.',
  heroHeadline: 'Keenpix vs TwicPics: two bandwidth-priced image CDNs',
  heroSubhead:
    'Both products optimize assets from origins you control and publish bandwidth-led managed plans. TwicPics adds context-aware frontend components and video optimization; Keenpix adds an AGPL-3.0 self-host path and a narrower image-only control plane. Compare those boundaries before comparing one monthly number.',
  verdict:
    'Choose TwicPics when its permanent 3 GB free plan, context-aware components, short-video optimization, smart cropping, or established responsive-media workflow matters. Choose Keenpix when its $9/100 GB, $29/400 GB, or $69/1 TB managed tiers fit the workload, when you want an image-only service, or when an AGPL-3.0 self-host path is part of the exit plan. For exactly 100 GB and one site, TwicPics Business estimates to $49 while Keenpix Basic lists $9; at 400 GB, the cheapest public TwicPics estimate is $159 on Business Plus while Keenpix Pro lists $29. Those are source-dated scenarios, not universal savings claims: video, smart-crop use, support, domains, annual terms, taxes, cache behavior, regions, and negotiated contracts can change the decision. TwicPics is the more established managed responsive-media product, while Keenpix is a younger image-focused product maintained by a solo founder.',
  pricingRows: [
    {
      scenario: 'Permanent free use',
      competitor:
        'Free: 3 GB CDN bandwidth, 1 workspace, 1 domain, 1 user; no custom domain',
      keenpix: '14-day trial: up to 20 GB and 2 projects; card required',
    },
    {
      scenario: '40 GB delivered / month',
      competitor: '$19 Business includes 40 GB',
      keenpix: '$9 Basic includes 100 GB',
    },
    {
      scenario: '100 GB delivered / month',
      competitor: '$49 estimate on Business: $19 plus 60 GB at $0.50/GB',
      keenpix: '$9 Basic includes 100 GB',
    },
    {
      scenario: '250 GB delivered / month',
      competitor: '$99 Business Plus includes 250 GB',
      keenpix: '$29 Pro includes 400 GB',
    },
    {
      scenario: '400 GB delivered / month',
      competitor: '$159 estimate on Business Plus: $99 plus 150 GB at $0.40/GB',
      keenpix: '$29 Pro includes 400 GB',
    },
    {
      scenario: '1 TB delivered / month',
      competitor: '$399 estimate on Business Plus: $99 plus 750 GB at $0.40/GB',
      keenpix: '$69 Business includes 1 TB',
    },
    {
      scenario: 'Meter boundary',
      competitor:
        'CDN bandwidth; paid-plan overage is billed on the following invoice',
      keenpix:
        'Optimized bytes delivered through managed Keenpix; transforms and team members are not separate meters',
    },
  ],
  featureRows: [
    {
      feature: 'Product boundary',
      competitor:
        'Managed responsive-media service for images and short videos',
      keenpix:
        'Managed image transformation and delivery plus a self-host release; no video product',
    },
    {
      feature: 'Original media',
      competitor:
        'Connects paths to media at your existing source; unlimited assets are published on every plan',
      keenpix:
        'Fetches from allowlisted HTTP or S3/R2-compatible origins; no upload library or DAM',
    },
    {
      feature: 'Transformation interface',
      competitor:
        'URL API with chained operations plus context-aware Native and Components integrations',
      keenpix:
        'URL query API with explicit resize, crop, quality, DPR, blur, and format controls',
    },
    {
      feature: 'Responsive frontend tooling',
      competitor:
        'Components for React/Next.js, Vue/Nuxt, Svelte/SvelteKit, Angular, React Native, Flutter, and web components',
      keenpix:
        'Framework loaders, components, and guides for major web frameworks; no context-aware browser sizing runtime',
    },
    {
      feature: 'Modern formats',
      competitor:
        'Automatic next-generation output plus explicit AVIF, WebP, JPEG, PNG, HEIF, and other documented outputs',
      keenpix: 'Automatic AVIF/WebP negotiation plus explicit image formats',
    },
    {
      feature: 'Smart media features',
      competitor:
        'Published smart crop, background removal, refit, watermarking, and video optimization capabilities',
      keenpix:
        'Focused deterministic image transforms; AI extensions and video are not claimed as generally available',
    },
    {
      feature: 'Custom domains',
      competitor:
        'Not on Free; Business publishes 2 domains for 1 workspace and Business Plus 3 per workspace across 3 workspaces',
      keenpix: 'Pro includes 1; Business includes 10',
    },
    {
      feature: 'Source and URL controls',
      competitor:
        'Source authentication, path configuration, cache purge, and paid-plan anomaly detection are documented',
      keenpix:
        'Per-project origin allowlists, SSRF hardening, optional HMAC signatures, quotas, and project logs',
    },
    {
      feature: 'Managed operations',
      competitor:
        'Managed SaaS and global CDN; enterprise publishes custom CDN, log export, purge API, and SLA options',
      keenpix:
        'Managed Cloudflare-backed delivery with project analytics, logs, domains, API keys, and billing controls',
    },
    {
      feature: 'Self-hosting',
      competitor: 'No public self-hosted TwicPics service edition documented',
      keenpix: 'Published v0.3.0 under AGPL-3.0 with Docker deployment files',
    },
    {
      feature: 'Support and maturity',
      competitor:
        'Paid plans publish premium email/live-chat support; enterprise adds dedicated success and SLA options',
      keenpix:
        'Founder support by email and WhatsApp; younger product with limited public customer evidence',
    },
  ],
  switchReasons: [
    {
      title: 'A larger managed allowance may fit image-only traffic',
      detail:
        'Keenpix publishes 100 GB at $9, 400 GB at $29, and 1 TB at $69. TwicPics publishes 40 GB at $19 and 250 GB at $99, then linear overage. Compare the same delivered month and preserve the value of any TwicPics video, smart-crop, component, support, or domain features you actually use.',
    },
    {
      title: 'An image-only boundary can simplify the bill',
      detail:
        'Keenpix deliberately excludes video, a DAM, uploads, and browser-context automation. That smaller product surface can be useful when the team already owns originals and only wants image transformation, delivery, project controls, and usage analytics. It is a limitation when TwicPics broader media workflow is the reason for the subscription.',
    },
    {
      title: 'A published self-host path changes the exit plan',
      detail:
        'Keenpix publishes its current engine under AGPL-3.0 with container deployment files. Self-hosting removes the Keenpix managed-service fee but transfers CDN configuration, infrastructure, database, caching, upgrades, abuse controls, monitoring, backups, and incidents to your team. Review the license and total operating cost before treating it as a discount.',
    },
    {
      title: 'Project settings and usage live in one control plane',
      detail:
        'Keenpix exposes origins, API keys, signatures, custom domains, request logs, cache behavior, latency, formats, bandwidth, and billing projections by project. Confirm that those narrower controls replace the TwicPics workspaces, anomaly detection, component configuration, and support workflows your teams currently rely on.',
    },
    {
      title: 'Server-generated URLs avoid a browser sizing runtime',
      detail:
        'Keenpix integrations can generate explicit responsive widths and formats at build or render time. Some teams prefer that deterministic boundary; other teams benefit from TwicPics context-aware components deriving requests from CSS, DPR, and browser state. This is an architectural preference to test, not a generic advantage.',
    },
  ],
  whenCompetitorWins: [
    'You want a permanent, feature-rich free plan for a site that stays within 3 GB each month. Keenpix offers a time-limited managed trial instead.',
    'Your frontend relies on TwicPics Components or Native for context-aware sizing, lazy loading, LQIP, art direction, transitions, or framework-specific media behavior.',
    'You optimize short videos or need TwicPics smart crop, background removal, refit, or watermark workflow; Keenpix is image-only and does not claim those AI features as generally available.',
    'You need an established responsive-media vendor, paid live-chat workflow, dedicated customer success, premium SLA, raw-log export, or custom-CDN enterprise options.',
    'Your existing TwicPics URL grammar, cache-purge process, workspace model, and custom domains are stable and the migration risk is worth more than a different public plan price.',
    'You prefer a fully managed SaaS with no AGPL licensing consideration and have no requirement for a self-host escape hatch.',
  ],
  migrationSteps: [
    'Inventory every TwicPics workspace, path, source, custom domain, cache-purge rule, API manipulation, component package, Native attribute, smart operation, video asset, and monthly bandwidth figure. Keep TwicPics serving production during the migration.',
    'Separate image URLs that Keenpix can support from video and TwicPics-specific smart operations. Retain TwicPics or choose another service for unsupported media instead of silently changing output.',
    'Create a Keenpix project for each ownership and trust boundary, then allowlist only the source hosts it must fetch. Verify private-source authentication and redirect behavior before exposing a route.',
    'Translate representative TwicPics manipulation chains into Keenpix resize, crop, fit, quality, DPR, blur, and format parameters. The grammars are not one-to-one, so save decoded-image fixtures for focal points, art direction, animations, and fallbacks.',
    'Replace TwicPics Components or Native behavior with explicit framework loaders, srcset widths, sizes, lazy/eager policy, dimensions, and priority for critical images. Measure LCP and CLS rather than assuming the replacement is equivalent.',
    'Introduce the Keenpix managed or custom hostname behind a canary. Compare output dimensions, visual crops, content type, Vary and Cache-Control, cold transforms, warm cache hits, source traffic, errors, and projected bills.',
    'Move the remaining image traffic only after a complete traffic cycle passes and rollback works. Keep old TwicPics URLs valid while search engines, email, cached HTML, applications, and third-party embeds age out.',
  ],
  faq: [
    {
      q: 'How does TwicPics pricing compare with Keenpix?',
      a: 'TwicPics publishes Free with 3 GB, Business at $19 for 40 GB plus $0.50/GB, and Business Plus at $99 for 250 GB plus $0.40/GB. Keenpix publishes $9 for 100 GB, $29 for 400 GB, and $69 for 1 TB with its own overage rates. Feature boundaries, domains, video, support, taxes, contracts, and actual delivered usage still need to be compared.',
    },
    {
      q: 'Does TwicPics charge for transformations or stored assets?',
      a: 'Its August 2026 pricing page describes unlimited assets and transformations and leads with CDN bandwidth allowances. Keenpix also does not separately meter transforms or source storage, but it is image-only and fetches originals from origins you operate. Read both current pricing pages before relying on a future estimate.',
    },
    {
      q: 'Can Keenpix replace TwicPics Components automatically?',
      a: 'No. TwicPics Components and Native can derive media requests from CSS layout, DPR, and browser context and include frontend behaviors such as LQIP and transitions. A Keenpix migration needs explicit responsive widths, sizes, dimensions, loading policy, art direction, and performance testing in the owning framework.',
    },
    {
      q: 'Does Keenpix optimize videos like TwicPics?',
      a: 'No. Keenpix processes images only. Keep TwicPics or select a separate video service for any video transformation, delivery, preview, or billing requirement.',
    },
    {
      q: 'Can TwicPics be self-hosted?',
      a: 'TwicPics public documentation describes a managed SaaS and does not document a self-hosted service edition. Keenpix publishes an AGPL-3.0 self-host release. Confirm private or enterprise TwicPics options directly with the vendor before treating public documentation as exhaustive.',
    },
    {
      q: 'Which product is faster?',
      a: 'This page does not claim a universal performance winner. Test both with the same origins, assets, regions, responsive widths, cache state, and browser mix. Record cold transformation, warm variant, edge-hit, error behavior, LCP, bytes, and cache headers before deciding.',
    },
    {
      q: 'Can I retain my existing image hostname?',
      a: 'Potentially, but a hostname migration requires ownership verification, certificates, DNS planning, cache behavior, URL compatibility, and a rollback window. Test the target on a temporary hostname and canary production traffic before changing DNS.',
    },
  ],
  sources: [
    { label: 'TwicPics pricing', url: 'https://www.twicpics.com/pricing' },
    {
      label: 'TwicPics integration options',
      url: 'https://www.twicpics.com/docs/getting-started/integration',
    },
    {
      label: 'TwicPics API transformations',
      url: 'https://www.twicpics.com/docs/reference/transformations',
    },
    {
      label: 'TwicPics Components',
      url: 'https://www.twicpics.com/docs/essentials/components',
    },
    {
      label: 'TwicPics cache purge guidance',
      url: 'https://help.twicpics.com/en/articles/8170483-how-to-purge-invalidate-assets-from-twicpics-cdn-cache',
    },
    { label: 'Keenpix pricing', url: '/pricing' },
    { label: 'Keenpix self-host documentation', url: '/docs/self-hosting' },
  ],
  pricingAsOf: 'August 2026',
  reviewer: 'Raed Bahri, Keenpix founder and maintainer',
  verifiedAt: '2026-08-22',
  nextReviewAt: '2026-10-12',
} satisfies ComparisonPageData
