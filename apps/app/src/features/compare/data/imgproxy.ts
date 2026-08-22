import type { ComparisonPageData } from '../comparison-data'

export const imgproxyComparison = {
  slug: 'imgproxy-alternative',
  competitor: 'imgproxy',
  title: 'imgproxy Alternative: Keenpix vs imgproxy (2026)',
  metaDescription:
    'Keenpix vs imgproxy (August 2026): managed image delivery vs a self-hosted transform engine. Compare costs, operations, security, migration, and fit.',
  heroHeadline: 'Keenpix vs imgproxy: managed delivery or a self-hosted engine',
  heroSubhead:
    'imgproxy is a fast, mature image-processing server you operate. Keenpix combines an open-source path with a managed image CDN, a dashboard, usage analytics, and one delivered-GB cloud meter. The real choice is ownership, not a fake feature-score winner.',
  verdict:
    'Choose imgproxy when your team wants direct control of the transform service, already operates containers and a CDN, values its Apache-2.0 core license, or needs an imgproxy-specific processing feature. Choose Keenpix managed cloud when you want a vendor to operate transformation, delivery, caches, usage metering, analytics, abuse controls, and updates behind one service. imgproxy open source has no license fee, but that is not a zero-cost delivery system: compute, egress, CDN, storage, observability, on-call work, upgrades, and capacity remain yours. imgproxy Pro starts at $49/month or $499/year for up to 16 workers and adds advanced features and support; infrastructure remains separate. Keenpix starts at $9/month for 100 GB of managed delivery with published overage. Keenpix is a younger, solo-founder product and imgproxy has a mature standalone engine with a broad processing surface, so teams that already own the platform work may rationally prefer imgproxy.',
  pricingRows: [
    {
      scenario: 'Open-source license',
      competitor: 'Apache-2.0 core with no imgproxy license fee',
      keenpix: 'AGPL-3.0 self-host release with no Keenpix license fee',
    },
    {
      scenario: 'Managed entry point',
      competitor:
        'No managed CDN plan; you assemble and operate the delivery stack',
      keenpix: '$9/month for 100 GB managed delivery',
    },
    {
      scenario: 'Commercial feature tier',
      competitor: 'Pro starts at $49/month or $499/year for up to 16 workers',
      keenpix:
        'Managed plans are $9/$29/$69 monthly; no separate transform-worker license',
    },
    {
      scenario: 'Compute and scaling',
      competitor:
        'Your servers, autoscaling, queues, concurrency, and capacity margin',
      keenpix:
        'Included in managed cloud; your workload is billed by delivered GB',
    },
    {
      scenario: 'CDN delivery and egress',
      competitor: 'Separate provider bill and configuration',
      keenpix:
        'Included in the managed-delivery meter; customer-owned CDN hits do not reach Keenpix',
    },
    {
      scenario: 'A 400 GB managed workload',
      competitor:
        'Cannot be derived from license price alone; model infrastructure, CDN, egress, and labor',
      keenpix: '$29/month Pro before any overage',
    },
  ],
  featureRows: [
    {
      feature: 'Product boundary',
      competitor: 'Standalone image-processing server',
      keenpix:
        'Managed image transformation and delivery service plus a self-host release',
    },
    {
      feature: 'Open-source license',
      competitor: 'Apache-2.0 core',
      keenpix: 'AGPL-3.0 published release',
    },
    {
      feature: 'Deployment',
      competitor: 'Docker is recommended; an official Helm chart is available',
      keenpix:
        'Managed cloud or documented Docker/Coolify self-host deployment',
    },
    {
      feature: 'URL protection',
      competitor:
        'HMAC URL signatures with key and salt; recommended for production',
      keenpix: 'Origin allowlists and optional HMAC signed URLs',
    },
    {
      feature: 'Modern formats',
      competitor: 'AVIF, WebP, JPEG XL, and other libvips-supported formats',
      keenpix: 'Automatic AVIF/WebP negotiation plus explicit format controls',
    },
    {
      feature: 'Processing depth',
      competitor:
        'Broad standalone processing surface; several advanced features are Pro-only',
      keenpix:
        'Focused resize, crop, quality, DPR, blur, format, and responsive delivery surface',
    },
    {
      feature: 'Processed-image cache',
      competitor:
        'You provide the cache/CDN architecture; imgproxy Pro includes an internal cache',
      keenpix: 'Managed memory, disk, object-storage, and delivery caching',
    },
    {
      feature: 'Dashboard and projects',
      competitor:
        'No managed multi-project SaaS dashboard in the open-source server',
      keenpix:
        'Projects, origin settings, API keys, domains, team access, and billing UI',
    },
    {
      feature: 'Usage analytics',
      competitor:
        'Prometheus/OpenTelemetry building blocks; you store and visualize telemetry',
      keenpix:
        'Bandwidth, cache, format, latency, top-image analytics, and request logs',
    },
    {
      feature: 'Operations',
      competitor:
        'You own upgrades, scaling, security patches, alerts, backups, and incidents',
      keenpix:
        'Keenpix owns the managed service; self-host users retain those responsibilities',
    },
    {
      feature: 'Support',
      competitor:
        'Community for OSS; priority creator support is a Pro benefit',
      keenpix:
        'Managed product support by email and WhatsApp; open-source issue tracker for public code',
    },
    {
      feature: 'Video previews and ML features',
      competitor: 'Available among imgproxy Pro capabilities',
      keenpix:
        'No video product; AI extensions are not claimed as generally available',
    },
  ],
  switchReasons: [
    {
      title: 'Replace a stack diagram with one managed boundary',
      detail:
        'A production imgproxy deployment normally sits beside compute orchestration, a delivery CDN, DNS/TLS, metrics, logs, alerting, secrets, rate controls, and an upgrade process. Keenpix managed cloud contracts those responsibilities into a service and exposes project settings and usage in one dashboard.',
    },
    {
      title: 'Forecast a delivery bill from delivered GB',
      detail:
        'imgproxy’s zero-dollar open-source license and worker-priced Pro license do not include infrastructure or delivery. Keenpix managed plans publish included delivered GB and linear overage, so the calculator can estimate a managed bill without pretending engineering time is free.',
    },
    {
      title: 'Give product teams self-service visibility',
      detail:
        'Keenpix includes project analytics, request logs, cache behavior, format mix, bandwidth savings, domains, and usage projections. An imgproxy team can build an excellent observability stack, but it must choose, connect, secure, retain, and operate those components.',
    },
    {
      title: 'Keep an escape hatch without operating it today',
      detail:
        'Keenpix publishes a self-host path for teams that later need control, while the managed cloud removes the immediate operational load. The licenses differ: evaluate AGPL-3.0 obligations for Keenpix and Apache-2.0 for imgproxy with your own counsel.',
    },
    {
      title: 'Separate origin trust by project',
      detail:
        'Managed Keenpix projects use explicit origin allowlists, optional signatures, quotas, and isolated settings. imgproxy has strong source restrictions and signed URLs, but multi-tenant project governance remains part of the platform you design around the server.',
    },
  ],
  whenCompetitorWins: [
    'Your platform team already operates Kubernetes or container services, a CDN, metrics, logs, alerts, and incident response, so another managed control plane adds little value.',
    'Apache-2.0 compatibility is a hard requirement and AGPL-3.0 is not acceptable for your self-hosted distribution model.',
    'You need a specific imgproxy processing option, codec, video-preview feature, or Pro ML capability that Keenpix does not provide.',
    'You want to tune worker concurrency, CPU and memory allocation, networking, cache topology, and release timing directly.',
    'Your traffic is large and predictable enough that owned infrastructure plus engineering time is demonstrably cheaper in your environment.',
    'You prefer imgproxy’s mature standalone engine and release history over adopting a younger managed product from a solo founder.',
  ],
  migrationSteps: [
    'Inventory every imgproxy URL option, preset, source scheme, signature rule, output format, and Pro-only feature in production. Mark any capability that has no Keenpix equivalent before changing traffic.',
    'Export a representative URL corpus and expected dimensions, content types, cache headers, visual crops, and failure responses. Use it as a regression set rather than relying on a few hand-picked images.',
    'Create one Keenpix project per trust and ownership boundary, then allowlist only the source hosts each project needs. Do not carry a permissive source policy into the managed configuration.',
    'Translate supported resize, crop, quality, DPR, blur, and format operations into Keenpix query parameters. Automatic AVIF/WebP negotiation can replace explicit format selection where that matches your cache strategy.',
    'Replace imgproxy path signatures with the Keenpix project URL shape and optional HMAC signature. Rotate keys and keep the old path available during the overlap instead of attempting a flag-day migration.',
    'Canary a small, measurable traffic slice. Compare visual output, origin fetches, cache hit rate, latency, error classes, and projected delivery cost under real traffic and multiple device widths.',
    'Move the remaining traffic only after the regression corpus and canary meet your thresholds. Keep a rollback route until cache behavior and billing projections remain stable through a complete traffic cycle.',
  ],
  faq: [
    {
      q: 'Is imgproxy free?',
      a: 'The imgproxy open-source core is Apache-2.0 and has no imgproxy license fee. A production service still needs compute, network egress, a CDN or cache strategy, DNS/TLS, monitoring, logs, upgrades, security work, and on-call ownership. imgproxy Pro is commercial and starts at $49/month or $499/year for up to 16 workers as of August 22, 2026.',
    },
    {
      q: 'Does Keenpix replace every imgproxy feature?',
      a: 'No. Keenpix focuses on common web image transformation and managed delivery. imgproxy has a broad processing surface and Pro features including advanced compression, dynamic watermarks, video previews, and ML-assisted operations. Inventory real production URLs before considering a move.',
    },
    {
      q: 'Which option is cheaper?',
      a: 'There is no honest universal answer. Keenpix publishes a managed delivered-GB price. imgproxy open source publishes no service fee because you supply the service; Pro prices workers but not infrastructure or CDN delivery. Model vendor bills and the operational work your team will actually own.',
    },
    {
      q: 'Can imgproxy sign transformation URLs?',
      a: 'Yes. imgproxy supports HMAC URL signatures using a key and salt and recommends enabling signing in production. Keenpix also supports signed delivery URLs and adds per-project origin allowlists in its managed control plane.',
    },
    {
      q: 'Can I self-host Keenpix instead?',
      a: 'A published Keenpix release is available under AGPL-3.0 with container deployment files. Self-hosting Keenpix also means you operate its infrastructure. Review the license and deployment architecture rather than treating either open-source option as managed service.',
    },
    {
      q: 'How should I compare a self-hosted engine with a managed CDN?',
      a: 'Use a total-cost worksheet: license, compute headroom, CDN and egress, object storage, monitoring, log retention, security patching, upgrades, incident response, and engineering ownership. Then compare feature fit, data boundaries, recovery expectations, and the value of direct control.',
    },
  ],
  sources: [
    { label: 'imgproxy pricing', url: 'https://imgproxy.net/pricing/' },
    { label: 'imgproxy FAQ', url: 'https://imgproxy.net/faq/' },
    {
      label: 'imgproxy installation',
      url: 'https://docs.imgproxy.net/latest/installation',
    },
    {
      label: 'imgproxy URL signing',
      url: 'https://docs.imgproxy.net/latest/usage/signing_url',
    },
    {
      label: 'imgproxy source and license',
      url: 'https://github.com/imgproxy/imgproxy',
    },
    {
      label: 'imgproxy releases',
      url: 'https://github.com/imgproxy/imgproxy/releases',
    },
    { label: 'Keenpix pricing', url: '/pricing' },
    { label: 'Keenpix self-host documentation', url: '/docs/self-hosting' },
  ],
  pricingAsOf: 'August 2026',
  reviewer: 'Raed Bahri, Keenpix founder and maintainer',
  verifiedAt: '2026-08-22',
  nextReviewAt: '2026-10-12',
} satisfies ComparisonPageData
