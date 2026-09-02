import { getPlanPricing } from '@/actions/billing/plan-pricing'
import { COMPARISONS } from '@/features/compare/comparison-data'
import { getPlanCardFeatures } from '@/features/marketing/plan-card-content'
import { TRUST_PAGES } from '@/features/marketing/trust-page'
import { PLANS, TRIAL } from '@/lib/billing/plans'
import { SUPPORT_EMAIL } from '@/shared/authors'
import { blogSource, listBlogPosts } from '@/shared/blog-source'
import { source } from '@/shared/docs-source'
import {
  LEARNING_GUIDE_CLASSIFICATION,
  LEARNING_PILLARS,
} from '@/shared/learning-content'
import { REPOSITORY_URL } from '@/shared/repository'
import changelog from '../../../../CHANGELOG.md?raw'

async function processedMarkdown(data: unknown) {
  if (
    typeof data === 'object' &&
    data !== null &&
    'getText' in data &&
    typeof data.getText === 'function'
  ) {
    try {
      return String(await data.getText('processed')).trim()
    } catch {
      return ''
    }
  }
  return ''
}

function markdownMetadata({
  author,
  canonicalUrl,
  description,
  published,
  title,
  updated,
}: {
  author?: string
  canonicalUrl: string
  description?: string
  published?: string
  title: string
  updated?: string
}) {
  return [
    `# ${title}`,
    '',
    description ? `> ${description}` : '',
    description ? '' : '',
    `Canonical HTML: [${canonicalUrl}](${canonicalUrl})`,
    author ? `Author: ${author}` : '',
    published ? `Published: ${published}` : '',
    updated ? `Last reviewed: ${updated}` : '',
    '',
  ]
    .filter((line, index, lines) => line || lines[index - 1])
    .join('\n')
}

function markdownTable(headings: string[], rows: string[][]) {
  const safe = (value: string) =>
    value.replaceAll('|', '\\|').replaceAll('\n', ' ')
  return [
    `| ${headings.map(safe).join(' | ')} |`,
    `| ${headings.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(safe).join(' | ')} |`),
  ].join('\n')
}

function comparisonMarkdown(pathname: string, origin: string) {
  const slug = pathname.slice('/compare/'.length)
  const comparison = COMPARISONS[slug]
  if (!comparison) {
    return null
  }
  const canonicalUrl = `${origin}${pathname}`

  return [
    markdownMetadata({
      author: comparison.reviewer,
      canonicalUrl,
      description: comparison.metaDescription,
      published: comparison.verifiedAt,
      title: comparison.title,
      updated: comparison.verifiedAt,
    }),
    comparison.verdict,
    '',
    `Facts verified: ${comparison.verifiedAt}. Pricing checked: ${comparison.pricingAsOf}. Next review: ${comparison.nextReviewAt}.`,
    '',
    '## Decision summary',
    '',
    comparison.heroSubhead,
    '',
    '## Feature comparison',
    '',
    markdownTable(
      ['Capability', comparison.competitor, 'Keenpix'],
      comparison.featureRows.map((row) => [
        row.feature,
        row.competitor,
        row.keenpix,
      ]),
    ),
    '',
    '## Pricing scenarios',
    '',
    'These scenarios use the assumptions shown on the canonical page. They are estimates, not quotes; taxes, contracts, regions, and vendor changes can alter the result.',
    '',
    markdownTable(
      ['Scenario', comparison.competitor, 'Keenpix'],
      comparison.pricingRows.map((row) => [
        row.scenario,
        row.competitor,
        row.keenpix,
      ]),
    ),
    '',
    `## When ${comparison.competitor} is the better fit`,
    '',
    ...comparison.whenCompetitorWins.map((item) => `- ${item}`),
    '',
    '## Reasons teams may switch',
    '',
    ...comparison.switchReasons.map(
      (item) => `### ${item.title}\n\n${item.detail}\n`,
    ),
    '## Migration path',
    '',
    ...comparison.migrationSteps.map((step, index) => `${index + 1}. ${step}`),
    '',
    ...(comparison.evaluationChecks
      ? [
          '## Verification checklist',
          '',
          ...comparison.evaluationChecks.map((item) => `- ${item}`),
          '',
        ]
      : []),
    '## Frequently asked questions',
    '',
    ...comparison.faq.flatMap((item) => [`### ${item.q}`, '', item.a, '']),
    '## Sources',
    '',
    ...comparison.sources.map(
      (item) =>
        `- [${item.label}](${item.url}), checked ${comparison.verifiedAt}.`,
    ),
    '',
    '## Limitations and disclosure',
    '',
    `Keenpix publishes this comparison and benefits if you choose it. “Best” means fit for the stated criteria, not a universal ranking. Vendor facts and prices can change after ${comparison.verifiedAt}; verify the linked primary sources before purchasing. No unmeasured performance, customer-rating, market-share, or savings claim is implied.`,
    '',
    '## Using Keenpix',
    '',
    `[Review Keenpix pricing](${origin}/pricing), [read the migration guides](${origin}/learn#topic-migrations), or [use the self-hosting path](${origin}/docs/self-hosting). Choose ${comparison.competitor} when the competitor-win criteria above match your requirements.`,
  ].join('\n')
}

async function pricingMarkdown(origin: string) {
  const pricing = await getPlanPricing()
  const rows = Object.values(PLANS).map((plan) => {
    const live = pricing.plans[plan.id]
    return [
      plan.name,
      `$${(live.month.amountCents / 100).toFixed(0)}/month`,
      `${plan.includedBandwidthBytes / 1024 ** 3} GB`,
      `$${(live.overagePerGbCents / 100).toFixed(2)}/GB`,
      plan.maxProjects === null ? 'Unlimited' : String(plan.maxProjects),
      plan.customDomains === null ? 'Unlimited' : String(plan.customDomains),
    ]
  })

  return [
    markdownMetadata({
      canonicalUrl: `${origin}/pricing`,
      description:
        'Managed image delivery is billed once by optimized bytes delivered, with published plan allowances and overage rates. Self-hosting has no Keenpix license fee but transfers infrastructure and operations to you.',
      title: 'Keenpix image CDN pricing',
      updated: '2026-09-02',
    }),
    `Managed plans include a ${TRIAL.days}-day trial. A card is required, trial usage is never billed, and paid delivery continues through overage instead of stopping at the plan allowance.`,
    '',
    markdownTable(
      [
        'Plan',
        'Monthly price',
        'Included delivery',
        'Overage',
        'Projects',
        'Custom domains',
      ],
      rows,
    ),
    '',
    '## What every managed plan includes',
    '',
    ...Object.values(PLANS).flatMap((plan) => [
      `### ${plan.name}`,
      '',
      ...getPlanCardFeatures(
        plan.id,
        pricing.plans[plan.id].overagePerGbCents,
      ).features.map((feature) => `- ${feature}`),
      '',
    ]),
    '## Self-hosting',
    '',
    'The released engine can be self-hosted under AGPL-3.0 with no Keenpix license fee. You pay for and operate compute, storage, databases, backups, monitoring, upgrades, security, and delivery infrastructure.',
    '',
    '## Billing boundary and limitations',
    '',
    'Managed billing counts successful optimized bytes delivered through the Keenpix-managed application and edge once. Pricing shown here is the current public self-service catalog returned by the same pricing source as the HTML page. Taxes, merchant-of-record behavior, legacy subscriptions, and future plan changes can affect a real invoice. Confirm the checkout total before purchase.',
    '',
    '## Next steps',
    '',
    `Use the [cost-model guide](${origin}/blog/transparent-image-cdn-pricing), the [workload calculator](${origin}/image-cdn-cost-calculator), or [compare managed and self-hosted delivery](${origin}/blog/self-host-vs-managed-image-optimization). Keenpix is not the right fit if you need a DAM, video platform, or a capability excluded by the product documentation.`,
  ].join('\n')
}

function trustMarkdown(
  pathname: '/security' | '/status' | '/support',
  origin: string,
) {
  const page = TRUST_PAGES[pathname.slice(1) as keyof typeof TRUST_PAGES]
  return [
    markdownMetadata({
      canonicalUrl: `${origin}${pathname}`,
      description: page.introduction,
      title: page.title,
      updated: '2026-09-02',
    }),
    ...page.sections.flatMap((section) => [
      `## ${section.title}`,
      '',
      section.body,
      '',
    ]),
    '## Related public sources',
    '',
    `- [Keenpix documentation](${origin}/docs)`,
    `- [Product changelog](${origin}/changelog)`,
    `- [Support and corrections](${origin}/support)`,
  ].join('\n')
}

const LEGAL_MARKDOWN = {
  '/legal/terms': `# Terms of Service

Last updated: August 5, 2026

These Terms govern access to and use of the Keenpix cloud service. By creating an account or using the service you agree to them.

## 1. The service

Keenpix is a hosted image-optimization proxy and CDN. You point it at images you are authorized to use; Keenpix fetches them from origins you control, then transforms, caches, and delivers them.

## 2. Accounts and workspaces

You are responsible for account credentials, workspace activity, accurate information, and keeping your email current. You must be at least 16.

## 3. Acceptable use

Do not deliver content without permission, probe or bypass security controls, overload the service, distribute malware or illegal material, or use Keenpix to build an open proxy.

## 4. Plans, billing, and usage

Polar is the merchant of record. Plans include a managed-delivery allotment; successful optimized delivery above it is billed at the published overage rate. Trial usage is not billed. Cancel before renewal to avoid the next charge.

## 5. Your content and origins

You retain rights to your images and grant Keenpix the limited permission needed to fetch, transform, cache, and deliver them. You are responsible for allowlisted origins and source rights.

## 6. Availability and changes

Keenpix aims for high availability but does not guarantee uninterrupted service. Features and these terms may change with reasonable notice.

## 7. Termination

You may stop at any time. Keenpix may suspend or terminate for breach, non-payment, credible security risk, or harmful activity, with notice where practical.

## 8. Disclaimers and liability

The service is provided as is. To the maximum extent permitted by law, aggregate liability is limited to amounts paid in the three months before the event giving rise to a claim.

## 9. Ownership and feedback

Keenpix and its licensors retain rights in the service, software, documentation, and branding. These terms do not transfer your content or Keenpix intellectual property.

## 10. Your responsibility

You are responsible for claims arising from content, origins, or instructions you provide. Keep independent source-asset copies and do not use Keenpix as your only archive.

## 11. Contact

Email ${SUPPORT_EMAIL}.`,
  '/legal/privacy': `# Privacy Policy

Last updated: July 15, 2026

This policy explains how Keenpix collects, uses, and protects personal data in the cloud service. Customers processing data for their own users are controllers and Keenpix acts as processor under the DPA.

## Data we collect

Account and authentication data; billing identifiers and subscription state; service configuration; operational request logs and aggregate delivery analytics; support communications; and consented website analytics.

## How we use data

To operate, secure, support, bill, and improve the service; communicate service information; investigate abuse; and comply with legal obligations. Keenpix does not sell personal data or use service data for targeted advertising.

## Sub-processors

Infrastructure and database providers, Cloudflare, ClickHouse, Polar, email delivery, and consented analytics may process the minimum data needed for their role. The DPA describes processing responsibilities.

## Analytics choices

Google Analytics remains off until a visitor chooses Allow analytics. Declining does not affect service use. The choice is remembered for one year and can be reset by clearing site data.

## Retention

Operational logs follow the plan retention window; aggregate analytics are retained for up to one year. Account data is kept while active and deleted or anonymized within a reasonable period after closure, subject to legal and backup obligations.

## Your rights

Depending on location, you may request access, correction, export, deletion, objection, or restriction by emailing ${SUPPORT_EMAIL}.

## Children

Keenpix is not directed to children under 16.

## Security

Keenpix uses in-transit encryption, tenant isolation, password hashing, and least-privilege access. No system is perfectly secure.

## Contact

Email ${SUPPORT_EMAIL}.`,
  '/legal/dpa': `# Data Processing Addendum

Last updated: July 13, 2026

This DPA forms part of the Terms between the customer as Controller and Keenpix as Processor for personal data processed through the cloud service.

## Scope and instructions

Keenpix processes personal data only to provide and secure the service, on documented customer instructions, and as required by law.

## Confidentiality and security

Authorized personnel are bound by confidentiality. Keenpix uses proportionate technical and organizational safeguards, including access controls, tenant isolation, transport encryption, and operational monitoring.

## Sub-processors

Keenpix may use infrastructure, delivery, analytics-storage, billing, email, and support providers. Keenpix remains responsible for its processor obligations and will make material changes available through public policy updates.

## Data-subject requests and incidents

Keenpix will provide reasonable assistance with data-subject requests and notify the Controller without undue delay after confirming a personal-data breach affecting Controller data.

## Deletion, return, and audits

On termination, data is deleted or returned according to the service and retention policy, subject to legal and backup obligations. Reasonable compliance information is available on request; intrusive audits require scope, confidentiality, and cost agreement.

## International transfers and precedence

The parties will use an applicable transfer mechanism where required. This DPA controls over conflicting processor terms in the Terms.

## Contact

Email ${SUPPORT_EMAIL}.`,
  '/legal/license': `# License & Open Source

Last updated: August 5, 2026

The released Keenpix engine is public and can be self-hosted with no Keenpix license fee. Operators remain responsible for infrastructure, security, backups, delivery, and compliance.

## Engine license

The engine is licensed under GNU AGPL-3.0. Review the repository LICENSE and obtain legal advice for your use. Releases already published retain their published license.

## Cloud service

Hosted-cloud use is governed by the Terms and Privacy Policy, not by the engine license alone.

## Third-party software

Keenpix includes third-party open-source packages with their own licenses. Distribution and deployment must preserve their terms.

## No lock-in

Cloud and self-hosting share a delivery URL model, but migration still requires configuration, data, cache, DNS, and operational planning.

## Editorial content and RSL

The source-code license does not unambiguously establish a separate machine-readable license for all public editorial content. Keenpix does not publish an RSL declaration without an explicit legal decision and approved content-license text.`,
} as const

function staticMarkdown(pathname: string, origin: string) {
  if (pathname === '/pricing') {
    return pricingMarkdown(origin)
  }
  if (
    pathname === '/security' ||
    pathname === '/status' ||
    pathname === '/support'
  ) {
    return trustMarkdown(pathname, origin)
  }
  if (pathname in LEGAL_MARKDOWN) {
    const body = LEGAL_MARKDOWN[pathname as keyof typeof LEGAL_MARKDOWN]
    return `${body}\n\nCanonical HTML: [${origin}${pathname}](${origin}${pathname})`
  }
  if (pathname === '/changelog') {
    return `${markdownMetadata({ canonicalUrl: `${origin}/changelog`, description: 'Every notable Keenpix release from the repository changelog.', title: 'Keenpix product changelog' })}\n${changelog.trim()}`
  }
  if (pathname === '/learn') {
    const posts = listBlogPosts()
    return [
      markdownMetadata({
        canonicalUrl: `${origin}/learn`,
        description:
          'Human-first learning paths for image CDN fundamentals, performance, cost, origins, security, operations, migrations, frameworks, and agent integration.',
        title: 'Keenpix Learn',
        updated: '2026-09-02',
      }),
      'Start with the problem, not the product. Every guide is designed to remain useful without its Keenpix next step.',
      '',
      ...LEARNING_PILLARS.flatMap((pillar) => {
        const matches = posts.filter(
          (post) =>
            LEARNING_GUIDE_CLASSIFICATION[
              post.slug as keyof typeof LEARNING_GUIDE_CLASSIFICATION
            ]?.pillar === pillar.id,
        )
        return [
          `## ${pillar.title}`,
          '',
          pillar.description,
          '',
          ...matches.map(
            (post) =>
              `- [${post.title}](${origin}${post.url}): ${post.description}`,
          ),
          '',
        ]
      }),
    ].join('\n')
  }
  if (pathname === '/blog' || pathname === '/blog/ar') {
    const language = pathname === '/blog/ar' ? 'ar' : 'en'
    return [
      markdownMetadata({
        canonicalUrl: `${origin}${pathname}`,
        description:
          language === 'ar'
            ? 'مقالات Keenpix حول تحسين الصور وتسليمها.'
            : 'Implementation guides, category education, and source-backed comparisons.',
        title: language === 'ar' ? 'مدونة Keenpix' : 'Keenpix blog',
        updated: '2026-09-02',
      }),
      ...listBlogPosts(language).map(
        (post) =>
          `- [${post.title}](${origin}${post.url}): ${post.description}`,
      ),
    ].join('\n')
  }
  if (pathname === '/compare') {
    return [
      markdownMetadata({
        canonicalUrl: `${origin}/compare`,
        description:
          'Dated, source-backed image CDN comparisons with explicit competitor wins and limitations.',
        title: 'Compare image CDN options',
        updated: '2026-09-02',
      }),
      'Keenpix writes these pages and benefits if you choose it. Each comparison uses primary vendor sources, visible assumptions, and a next-review date.',
      '',
      ...Object.values(COMPARISONS).map(
        (comparison) =>
          `- [Keenpix vs ${comparison.competitor}](${origin}/compare/${comparison.slug}): ${comparison.metaDescription}`,
      ),
      '',
      `Read the [comparison methodology](${origin}/methodology/comparisons).`,
    ].join('\n')
  }
  if (pathname === '/methodology/comparisons') {
    return `${markdownMetadata({ canonicalUrl: `${origin}${pathname}`, description: 'How Keenpix verifies competitor facts, calculates pricing scenarios, discloses conflicts, and corrects comparison pages.', title: 'How Keenpix comparisons are researched', updated: '2026-09-02' })}\n## Source order\n\n1. Official pricing, product documentation, limits, and legal terms.\n2. Official release notes and support statements.\n3. Reproducible product behavior where public documentation is incomplete.\n\nUndocumented behavior stays labeled unknown. No customer ratings, market-share claims, or performance benchmarks are published without inspectable evidence.\n\n## Pricing comparisons\n\nEvery scenario states its workload and uses the public price checked on the page date. Taxes, contracts, legacy plans, regional differences, and external CDN charges remain limitations.\n\n## Product scope and licensing\n\nA media platform, image optimizer, CDN feature, and self-hosted transform engine are not interchangeable. Source-code licenses are checked from the applicable release.\n\n## Review and corrections\n\nCommercial facts are reviewed at least quarterly and after material announcements. Send the page, disputed statement, primary source, and check date to ${SUPPORT_EMAIL}.\n\n## What a verdict means\n\n“Best for” is a fit judgment for stated criteria, not a universal ranking. Every comparison states when the competitor is the better choice.`
  }
  if (pathname === '/developers') {
    return `${markdownMetadata({ canonicalUrl: `${origin}/developers`, description: 'API discovery, project-scoped authentication, official SDK, and agent-readable public contracts.', title: 'Keenpix developer resources', updated: '2026-09-02' })}\n## Discover the API\n\n- [OpenAPI 3.1 specification](${origin}/openapi.json)\n- [SDK API documentation](${origin}/docs/reference/sdk-api)\n- [Public JSON health endpoint](${origin}/api/health)\n\n## Use the official SDK\n\nThe supported automation client is the server-side @keenpix/sdk package. Keenpix does not publish an official CLI, OAuth authorization server, or separate API sandbox.\n\n## Authentication and onboarding\n\nControl-plane operations use a project-scoped API key in Authorization: Bearer or X-Keenpix-Api-Key. Normal image delivery URLs are keyless after project and origin configuration. Keep keys in trusted server environments.\n\n## Agent-readable sources\n\n- [Concise LLM index](${origin}/llms.txt)\n- [Complete Markdown collection](${origin}/llms-full.txt)\n- [Learning hub](${origin}/learn)\n\nContact ${SUPPORT_EMAIL}.`
  }
  if (pathname === '/about') {
    return `${markdownMetadata({ canonicalUrl: `${origin}/about`, description: 'Keenpix is a focused image optimization CDN with managed delivery and an AGPL-3.0 self-hosted engine.', title: 'The honest image CDN', updated: '2026-09-02' })}\n## Product principles\n\n- Bill managed customers for successful optimized delivery, not transforms or seats.\n- Keep the released engine open source and the source origin under customer control.\n- Publish limits, prices, dated comparisons, and corrections without invented proof.\n\n## Product-fact sources\n\nThe public repository, release history, documentation, changelog, trust pages, and dated comparison sources are the inspection surfaces. Missing metrics, certifications, and benchmarks remain unknown.\n\n## Company and contact\n\nSource: [GitHub](${REPOSITORY_URL}). Contact: ${SUPPORT_EMAIL}.`
  }
  if (pathname === '/self-hosted-image-cdn') {
    return `${markdownMetadata({ canonicalUrl: `${origin}${pathname}`, description: 'Run the Keenpix image transformation, cache, dashboard, analytics, origin controls, and signed delivery stack on infrastructure you operate.', title: 'The self-hosted image CDN that keeps the dashboard', updated: '2026-09-02' })}\n## What is included\n\nThe released AGPL-3.0 stack includes transforms, cache tiers, per-project origin allowlists, signed URLs, dashboard operations, and delivery analytics. There is no Keenpix license fee.\n\n## Your responsibilities\n\nYou own compute, storage, database, CDN configuration, TLS, network policy, backups, upgrades, monitoring, capacity, and incident response. Self-hosting is not a universal cost shortcut.\n\n## Architecture\n\nPlace a correctly configured CDN in front of the transform service and include every byte-changing input in the cache identity. Verify query strings and Accept variation before traffic.\n\n## Limitations and alternatives\n\nKeenpix is not a DAM or video platform. Choose imgproxy when you want a focused transform primitive, or a full media platform when uploads, library workflows, and video belong together.\n\n## Procedure\n\nFollow the [version-synchronized self-hosting guide](${origin}/docs/self-hosting), [health and operations](${origin}/docs/self-hosting/health-and-operations), and [safe rollout guide](${origin}/blog/safe-image-cdn-rollouts-and-rollbacks).`
  }
  if (pathname === '/image-cdn-cost-calculator') {
    return `${markdownMetadata({ canonicalUrl: `${origin}${pathname}`, description: 'A source-dated workload model for comparing image delivery providers without treating estimates as quotes.', title: 'Image CDN cost calculator', updated: '2026-09-02' })}\n## Inputs\n\nDelivered GB, requests, unique transforms, source storage, projects, custom domains, and region.\n\n## Method\n\nThe calculator applies only public, source-backed pricing components implemented for each provider. Rows are labeled Estimated, Partial only, or Quote required. It does not invent enterprise discounts, CDN rates, taxes, or missing product behavior.\n\n## Verify before buying\n\nConfirm the provider's current pricing page, define the same workload, include external CDN/storage/operations, and inspect the calculation coverage note. An estimate is not an invoice or savings guarantee.\n\nUse the interactive [canonical calculator](${origin}${pathname}) and read [transparent image CDN pricing](${origin}/blog/transparent-image-cdn-pricing).`
  }
  if (pathname === '/authors/raed-bahri') {
    return `${markdownMetadata({ author: 'Raed Bahri', canonicalUrl: `${origin}${pathname}`, description: 'Author and maintainer profile for Keenpix technical and comparison content.', title: 'Raed Bahri', updated: '2026-09-02' })}\nRaed Bahri builds and maintains Keenpix. Technical claims are checked against current public code and documentation; volatile competitor facts use dated primary sources. Request corrections through [support](${origin}/support).`
  }
  if (pathname === '/') {
    return `${markdownMetadata({ canonicalUrl: `${origin}/`, description: 'Keenpix is a developer-focused image optimization CDN available as managed cloud or an AGPL-3.0 self-hosted engine.', title: 'Keenpix image optimization CDN', updated: '2026-09-02' })}\n## What it does\n\nKeenpix transforms allowlisted source images, caches variants, and delivers responsive AVIF, WebP, JPEG, PNG, and other documented outputs.\n\n## Choose a path\n\n- [Learn image delivery fundamentals](${origin}/learn)\n- [Start the cloud quickstart](${origin}/docs/getting-started/cloud-quickstart)\n- [Evaluate self-hosting](${origin}/self-hosted-image-cdn)\n- [Review pricing](${origin}/pricing)\n- [Read security boundaries](${origin}/security)\n\n## Limitations\n\nKeenpix is not a DAM, source asset library, video platform, OAuth server, public API sandbox, or official CLI. Use the system that owns those requirements.`
  }
  return null
}

export async function getPublicMarkdown(pathname: string, origin: string) {
  if (pathname === '/blog' || pathname === '/blog/ar') {
    return staticMarkdown(pathname, origin)
  }
  if (pathname.startsWith('/blog/')) {
    const page = blogSource.getPage(pathname.slice('/blog/'.length).split('/'))
    if (!page || page.data.draft) {
      return null
    }
    const body = await processedMarkdown(page.data)
    return [
      markdownMetadata({
        author: page.data.author,
        canonicalUrl: `${origin}${page.url}`,
        description: page.data.description,
        published: page.data.date,
        title: page.data.title,
        updated: page.data.updated ?? page.data.date,
      }),
      body || page.data.description,
    ].join('\n')
  }
  if (pathname === '/docs' || pathname.startsWith('/docs/')) {
    const slugs =
      pathname === '/docs' ? [] : pathname.slice('/docs/'.length).split('/')
    const page = source.getPage(slugs)
    if (!page) {
      return null
    }
    const body = await processedMarkdown(page.data)
    return [
      markdownMetadata({
        author: 'Keenpix Team',
        canonicalUrl: `${origin}${page.url}`,
        description: page.data.description,
        title: page.data.title ?? 'Keenpix documentation',
        updated: page.data.updated,
      }),
      body || page.data.description || '',
    ].join('\n')
  }
  if (pathname.startsWith('/compare/')) {
    return comparisonMarkdown(pathname, origin)
  }
  return staticMarkdown(pathname, origin)
}

export async function listPublicMarkdown(origin: string) {
  const staticPaths = [
    '/',
    '/about',
    '/authors/raed-bahri',
    '/blog',
    '/blog/ar',
    '/changelog',
    '/compare',
    '/developers',
    '/image-cdn-cost-calculator',
    '/learn',
    '/legal/dpa',
    '/legal/license',
    '/legal/privacy',
    '/legal/terms',
    '/methodology/comparisons',
    '/pricing',
    '/security',
    '/self-hosted-image-cdn',
    '/status',
    '/support',
    ...Object.keys(COMPARISONS).map((slug) => `/compare/${slug}`),
    ...source.getPages().map((page) => page.url),
    ...blogSource
      .getPages()
      .filter((page) => !page.data.draft)
      .map((page) => page.url),
  ]
  const paths = [...new Set(staticPaths)]
  const documents = await Promise.all(
    paths.map(async (pathname) => ({
      markdown: await getPublicMarkdown(pathname, origin),
      pathname,
    })),
  )
  return documents.filter(
    (document): document is { markdown: string; pathname: string } =>
      Boolean(document.markdown),
  )
}
