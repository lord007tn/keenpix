export const LEARNING_PILLARS = [
  {
    id: 'fundamentals',
    title: 'Image CDN fundamentals',
    description:
      'Understand the delivery path, responsive images, formats, and cache behavior before choosing a product.',
  },
  {
    id: 'performance',
    title: 'Performance',
    description:
      'Measure real image delivery, control variant growth, and improve the slow path without invented benchmarks.',
  },
  {
    id: 'cost',
    title: 'Cost and buying',
    description:
      'Model the whole bill, compare service boundaries, and decide when managed or self-hosted delivery fits.',
  },
  {
    id: 'origins',
    title: 'Origins and architecture',
    description:
      'Keep ownership of source assets while designing a safe, cacheable path from origin to delivery edge.',
  },
  {
    id: 'security',
    title: 'Security',
    description:
      'Separate public delivery from private origins, constrain fetches, and protect transform URLs from abuse.',
  },
  {
    id: 'operations',
    title: 'Operations and troubleshooting',
    description:
      'Diagnose symptoms from the browser back to the origin, then deploy, observe, and roll back safely.',
  },
  {
    id: 'migrations',
    title: 'Migrations',
    description:
      'Translate URLs and behavior, canary representative traffic, and retain a tested reversal path.',
  },
  {
    id: 'frameworks',
    title: 'Frameworks',
    description:
      'Connect responsive image markup and framework loaders without hiding the underlying delivery contract.',
  },
  {
    id: 'agents',
    title: 'Agent integration',
    description:
      'Give coding agents bounded, inspectable context and verify their integration against the same public contracts.',
  },
] as const

export const LEARNING_JOBS = [
  {
    id: 'understand',
    label: 'Understand the system',
    description: 'Build a correct mental model before changing production.',
  },
  {
    id: 'evaluate',
    label: 'Evaluate options',
    description: 'Compare ownership, capabilities, cost, and limits fairly.',
  },
  {
    id: 'integrate',
    label: 'Build an integration',
    description: 'Turn an origin URL into responsive, verifiable delivery.',
  },
  {
    id: 'secure',
    label: 'Secure the pipeline',
    description: 'Constrain origins, URLs, credentials, and transform inputs.',
  },
  {
    id: 'operate',
    label: 'Operate and recover',
    description: 'Measure, troubleshoot, canary, and roll back safely.',
  },
] as const

export const LEARNING_GUIDE_CLASSIFICATION = {
  'what-is-an-image-cdn': {
    pillar: 'fundamentals',
    jobs: ['understand', 'evaluate'],
    featured: true,
  },
  'image-cdn-vs-traditional-cdn': {
    pillar: 'fundamentals',
    jobs: ['understand', 'evaluate'],
  },
  'responsive-image-cdn-guide': {
    pillar: 'fundamentals',
    jobs: ['understand', 'integrate'],
  },
  'avif-vs-webp-production-caching': {
    pillar: 'fundamentals',
    jobs: ['evaluate', 'operate'],
  },
  'reproducible-image-performance-measurement': {
    pillar: 'performance',
    jobs: ['evaluate', 'operate'],
    featured: true,
  },
  'image-cdn-cache-keys-vary-accept': {
    pillar: 'performance',
    jobs: ['integrate', 'operate'],
  },
  'image-transform-cache-stampedes-capacity': {
    pillar: 'performance',
    jobs: ['operate', 'secure'],
  },
  'transparent-image-cdn-pricing': {
    pillar: 'cost',
    jobs: ['evaluate'],
    featured: true,
  },
  'best-image-cdns-2026': {
    pillar: 'cost',
    jobs: ['evaluate'],
  },
  'keenpix-vs-cloudinary': {
    pillar: 'cost',
    jobs: ['evaluate', 'integrate'],
  },
  'keenpix-vs-imagekit': {
    pillar: 'cost',
    jobs: ['evaluate', 'integrate'],
  },
  'keenpix-vs-imgix': {
    pillar: 'cost',
    jobs: ['evaluate', 'integrate'],
  },
  'self-host-vs-managed-image-optimization': {
    pillar: 'cost',
    jobs: ['evaluate', 'operate'],
  },
  'bring-your-own-origin-image-cdn-architecture': {
    pillar: 'origins',
    jobs: ['understand', 'integrate', 'secure'],
    featured: true,
  },
  'private-image-origins-security-boundaries': {
    pillar: 'security',
    jobs: ['secure', 'integrate'],
    featured: true,
  },
  'secure-image-pipelines-ssrf-image-bombs': {
    pillar: 'security',
    jobs: ['secure', 'operate'],
  },
  'signed-image-urls-hmac': {
    pillar: 'security',
    jobs: ['secure', 'integrate'],
  },
  'image-delivery-troubleshooting-by-symptom': {
    pillar: 'operations',
    jobs: ['operate'],
    featured: true,
  },
  'safe-image-cdn-rollouts-and-rollbacks': {
    pillar: 'operations',
    jobs: ['operate', 'integrate'],
  },
  'self-host-image-cdn-docker': {
    pillar: 'operations',
    jobs: ['operate', 'evaluate'],
  },
  'migrate-cloudinary-to-keenpix': {
    pillar: 'migrations',
    jobs: ['integrate', 'operate'],
  },
  'migrate-imagekit-to-keenpix': {
    pillar: 'migrations',
    jobs: ['integrate', 'operate'],
  },
  'migrate-vercel-image-optimization-to-keenpix': {
    pillar: 'migrations',
    jobs: ['integrate', 'operate'],
  },
  'nextjs-custom-image-cdn-loader': {
    pillar: 'frameworks',
    jobs: ['integrate'],
  },
  'joodcms-keenpix-integration': {
    pillar: 'frameworks',
    jobs: ['integrate', 'operate'],
  },
  'agent-assisted-image-cdn-integration': {
    pillar: 'agents',
    jobs: ['integrate', 'secure', 'operate'],
    featured: true,
  },
} as const

export const FEATURED_LEARNING_SLUGS = Object.entries(
  LEARNING_GUIDE_CLASSIFICATION,
)
  .filter(([, classification]) => 'featured' in classification)
  .map(([slug]) => slug)
