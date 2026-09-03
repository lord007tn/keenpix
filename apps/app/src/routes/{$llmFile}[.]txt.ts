import { createFileRoute } from '@tanstack/react-router'
import { COMPARISONS } from '@/features/compare/comparison-data'
import { getAppUrl, isCloud } from '@/server/deployment'
import { listPublicMarkdown } from '@/server/public-markdown'
import {
  SUPPORT_EMAIL,
  SUPPORT_WHATSAPP_LABEL,
  SUPPORT_WHATSAPP_URL,
} from '@/shared/authors'

export const Route = createFileRoute('/{$llmFile}.txt')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!isCloud()) {
          return new Response('Not found', { status: 404 })
        }
        if (params.llmFile === 'llms') {
          return textResponse(buildLlmsIndex())
        }
        if (params.llmFile === 'llms-full') {
          return textResponse(await llmsFull())
        }
        return new Response('Not found', { status: 404 })
      },
    },
  },
})

export function buildLlmsIndex() {
  const baseUrl = getAppUrl()
  return `# Keenpix image delivery knowledge

> Official public sources for Keenpix, a focused image optimization CDN available as managed cloud or an AGPL-3.0 self-hosted engine. Use the learning hub for human-first navigation and the complete export only when broader context is required.

## Learn by task

- [Keenpix Learn](${baseUrl}/learn.md): answer-first paths across fundamentals, performance, cost, origins, security, operations, migrations, frameworks, and agent integration.
- [Bring your own origin](${baseUrl}/blog/bring-your-own-origin-image-cdn-architecture.md): architecture, access models, cache identity, rollout, and verification.
- [Design a user-upload image pipeline](${baseUrl}/blog/user-upload-image-pipeline-design.md): authenticated ingestion, byte validation, quarantine, moderation, publication, delivery, and recovery.
- [Use versioned image URLs](${baseUrl}/blog/cache-invalidation-versioned-image-urls.md): immutable identity, layered cache behavior, publication, purge limits, rollback, and verification.
- [Troubleshoot image delivery](${baseUrl}/blog/image-delivery-troubleshooting-by-symptom.md): diagnose broken, slow, stale, oversized, or incorrectly cropped images.
- [Measure image performance](${baseUrl}/blog/reproducible-image-performance-measurement.md): separate cold transforms, warm caches, browser rendering, and field evidence.
- [Secure private origins](${baseUrl}/blog/private-image-origins-security-boundaries.md): source authorization, viewer authorization, caching, revocation, and limits.
- [Roll out and roll back safely](${baseUrl}/blog/safe-image-cdn-rollouts-and-rollbacks.md): canary gates, continuity evidence, and cache-aware reversal.
- [Integrate with a coding agent](${baseUrl}/blog/agent-assisted-image-cdn-integration.md): bounded public context, acceptance tests, crawler scope, and authority limits.

## Product and plans

- [Keenpix](${baseUrl}/index.md): product scope and paths.
- [Pricing](${baseUrl}/pricing.md): current public managed plan terms, billing boundary, self-host responsibility, and limitations.
- [Self-hosted image CDN](${baseUrl}/self-hosted-image-cdn.md): included stack, operator responsibilities, architecture, and alternatives.
- [Comparison hub](${baseUrl}/compare.md): dated vendor comparisons with primary sources and competitor-win criteria.

## Developer contracts

- [Developer resources](${baseUrl}/developers.md): API discovery, authentication, SDK, and agent-readable sources.
- [Transform endpoint](${baseUrl}/docs/reference/endpoint.md): image delivery URL and response contract.
- [SDK API](${baseUrl}/docs/reference/sdk-api.md): authenticated project-scoped control-plane operations.
- [OpenAPI 3.1](${baseUrl}/openapi.json): typed public API contract.
- [Node SDK](${baseUrl}/docs/reference/sdk-package.md): official server-side @keenpix/sdk client.
- [Framework catalog](${baseUrl}/docs/frameworks.md): supported integration families and implementation paths.

Control-plane operations require project-scoped server-side API keys. Normal image delivery is keyless after project configuration. Keenpix does not operate an OAuth authorization server, separate API sandbox, or official CLI.

## Trust, support, and legal

- [Security and data handling](${baseUrl}/security.md): current controls and explicit claim limits.
- [Service status guidance](${baseUrl}/status.md): current health, incident reporting, and absence of an uptime-history claim.
- [Support and corrections](${baseUrl}/support.md): safe issue, vulnerability, and editorial-correction paths.
- [Product changelog](${baseUrl}/changelog.md): released product history from the repository source.
- [Terms](${baseUrl}/legal/terms.md)
- [Privacy](${baseUrl}/legal/privacy.md)
- [Data Processing Addendum](${baseUrl}/legal/dpa.md)
- [License and open source](${baseUrl}/legal/license.md): code-license boundary and the absence of an invented RSL declaration.

API and documentation contact: [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}) or [WhatsApp ${SUPPORT_WHATSAPP_LABEL}](${SUPPORT_WHATSAPP_URL}).

## Complete collection

- [All canonical public knowledge in Markdown](${baseUrl}/llms-full.txt): generated from the same per-page Markdown registry used by .md and Accept: text/markdown responses.
`
}

async function llmsFull() {
  const baseUrl = getAppUrl()
  const documents = await listPublicMarkdown(baseUrl)
  return [
    '# Keenpix complete public knowledge collection',
    '',
    '> Generated from the same registry as each canonical page Markdown response. Canonical HTML remains authoritative for interactive behavior; dated primary sources remain authoritative for volatile external facts.',
    '',
    `Generated coverage: ${documents.length} public knowledge pages, including ${Object.keys(COMPARISONS).length} structured comparisons.`,
    '',
    ...documents.flatMap((document) => [
      '---',
      '',
      `Markdown path: ${baseUrl}${document.pathname === '/' ? '/index.md' : `${document.pathname}.md`}`,
      '',
      document.markdown,
      '',
    ]),
  ].join('\n')
}

function textResponse(body: string) {
  return new Response(body, {
    headers: {
      'cache-control': 'public, max-age=3600',
      'content-type': 'text/plain; charset=utf-8',
      link: '</llms.txt>; rel="describedby"',
    },
  })
}
