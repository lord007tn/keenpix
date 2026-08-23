import { createFileRoute } from '@tanstack/react-router'
import { llms } from 'fumadocs-core/source'
import { COMPARISONS } from '@/features/compare/comparison-data'
import { getAppUrl, isCloud } from '@/server/deployment'
import {
  SUPPORT_EMAIL,
  SUPPORT_WHATSAPP_LABEL,
  SUPPORT_WHATSAPP_URL,
} from '@/shared/authors'
import { blogSource, listBlogPosts } from '@/shared/blog-source'
import { source } from '@/shared/docs-source'
import { MARKETING_FAQ } from '@/shared/marketing-faq'

// fumadocs attaches getText() to each page's data at runtime to expose the
// processed Markdown body (enabled via includeProcessedMarkdown in
// source.config.ts). The loader's Data type doesn't surface it, so read it
// through a structural check.
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

const generator = llms(source, {
  renderName: (node) => {
    if (node.type === 'root') {
      return 'Keenpix documentation'
    }

    return typeof node.name === 'string' ? node.name : ''
  },
  renderDescription: (node) => {
    if (node.type === 'root') {
      return 'Documentation for Keenpix — an image optimization CDN available as managed cloud or a self-hosted open-source engine.'
    }

    return typeof node.description === 'string' ? node.description : ''
  },
})

export const Route = createFileRoute('/{$llmFile}.txt')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!isCloud()) {
          return new Response('Not found', { status: 404 })
        }

        if (params.llmFile === 'llms') {
          return textResponse(llmsIndex())
        }

        if (params.llmFile === 'llms-full') {
          return textResponse(await llmsFull())
        }

        return new Response('Not found', { status: 404 })
      },
    },
  },
})

function llmsIndex() {
  const baseUrl = getAppUrl()
  const comparisonList = Object.values(COMPARISONS)
    .map(
      (comparison) =>
        `- [Keenpix vs ${comparison.competitor}](${baseUrl}/compare/${comparison.slug}): ${comparison.metaDescription}`,
    )
    .join('\n')
  const blogList = listBlogPosts()
    .map(
      (post) => `- [${post.title}](${baseUrl}${post.url}): ${post.description}`,
    )
    .join('\n')

  return `# Keenpix product, documentation, and research

> Official public sources for Keenpix, a developer-focused image optimization CDN available as managed cloud or an AGPL-3.0 self-hosted engine.

## Product and plans

- [Keenpix image CDN](${baseUrl}/): product scope, delivery model, security controls, analytics, and deployment paths.
- [Image CDN pricing](${baseUrl}/pricing): current managed plan allowances, overage rates, trial terms, and billing boundary.
- [Self-hosted image CDN](${baseUrl}/self-hosted-image-cdn): Docker deployment, architecture, operational responsibilities, limitations, and alternatives.
- [Comparison hub](${baseUrl}/compare): dated, source-backed vendor comparisons and best-fit guidance.

## Developer resources

- [Keenpix developer resources](${baseUrl}/developers): API discovery, authentication, onboarding, SDK, and machine-readable references.
- [OpenAPI specification](${baseUrl}/openapi.json): OpenAPI 3.1 contract with unique operation IDs, typed parameters and schemas, response definitions, and API-key security schemes.
- [SDK API documentation](${baseUrl}/docs/reference/sdk-api): versioned JSON control-plane API for trusted backend integrations.
- [Node SDK package](${baseUrl}/docs/reference/sdk-package): official \`@keenpix/sdk\` client published on npm.
- [Public API health](${baseUrl}/api/health): unauthenticated JSON health for the Keenpix app.

Control-plane operations use project-scoped API keys. Keenpix does not operate an OAuth authorization server, separate API sandbox, or official CLI. Integrations can call the REST API directly or use \`@keenpix/sdk\`.

API contact: [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}) or [WhatsApp ${SUPPORT_WHATSAPP_LABEL}](${SUPPORT_WHATSAPP_URL}).

${generator.index()}

## Comparisons

${comparisonList}

## Trust and methodology

- [About Keenpix](${baseUrl}/about): company, founder, product principles, and public profiles.
- [Security and data handling](${baseUrl}/security): origin controls, signed URLs, infrastructure boundaries, and claim limits.
- [Comparison methodology](${baseUrl}/methodology/comparisons): source order, pricing assumptions, disclosures, review cadence, and corrections.
- [Support and corrections](${baseUrl}/support): reporting product issues and requesting factual corrections.
- [Service status guidance](${baseUrl}/status): current health checks, incident communication, and status limitations.

## Blog

${blogList}

## Full Markdown

- [Full documentation](${baseUrl}/llms-full.txt): all public Keenpix docs, blog posts, and FAQ in one Markdown file.
`
}

async function llmsFull() {
  const baseUrl = getAppUrl()
  const comparisonSections = Object.values(COMPARISONS).map((comparison) =>
    [
      `## Keenpix vs ${comparison.competitor}`,
      '',
      `Source: ${baseUrl}/compare/${comparison.slug}`,
      '',
      comparison.verdict,
      '',
      `Facts verified: ${comparison.verifiedAt}; next review: ${comparison.nextReviewAt}.`,
      '',
    ].join('\n'),
  )
  const docsSections = await Promise.all(
    source.getPages().map(async (page) => {
      const body = await processedMarkdown(page.data)
      const fallback = [
        page.data.description,
        `Canonical URL: ${baseUrl}${page.url}`,
      ]
        .filter(Boolean)
        .join('\n\n')

      return [
        `## ${page.data.title ?? page.url}`,
        '',
        `Source: ${baseUrl}${page.url}`,
        '',
        body || fallback,
        '',
      ].join('\n')
    }),
  )

  // Full post bodies (the comparison posts are the site's best GEO asset),
  // falling back to the description if processing ever yields nothing.
  const blogSections = await Promise.all(
    blogSource
      .getPages()
      .filter((page) => !page.data.draft)
      .map(async (page) => {
        const body = await processedMarkdown(page.data)
        return [
          `## ${page.data.title}`,
          '',
          `Source: ${baseUrl}${page.url}`,
          '',
          body || page.data.description,
          '',
        ].join('\n')
      }),
  )

  const faqSections = MARKETING_FAQ.map((item) =>
    [`## ${item.question}`, '', item.answer, ''].join('\n'),
  )

  return [
    '# Keenpix product, documentation, and research',
    '',
    'Official public sources for Keenpix, an image optimization CDN available as managed cloud or an AGPL-3.0 self-hosted engine.',
    '',
    `Product: ${baseUrl}/`,
    `Pricing and plan terms: ${baseUrl}/pricing`,
    `Self-hosting: ${baseUrl}/self-hosted-image-cdn`,
    `Comparison methodology: ${baseUrl}/methodology/comparisons`,
    '',
    ...docsSections,
    '# Keenpix blog',
    '',
    'Implementation guides, category education, and source-backed vendor comparisons from the Keenpix team.',
    '',
    ...blogSections,
    '# Keenpix comparisons',
    '',
    ...comparisonSections,
    '# Frequently asked questions',
    '',
    ...faqSections,
  ].join('\n')
}

function textResponse(body: string) {
  return new Response(body, {
    headers: {
      'cache-control': 'public, max-age=3600',
      'content-type': 'text/plain; charset=utf-8',
    },
  })
}
