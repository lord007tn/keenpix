import {
  SUPPORT_EMAIL,
  SUPPORT_WHATSAPP_LABEL,
  SUPPORT_WHATSAPP_URL,
} from '@/shared/authors'
import { getMarkdownPathname } from '@/shared/markdown-discovery'

const DOCUMENT_REPRESENTATIONS = ['text/html', 'text/markdown']
const FILE_PATH_PATTERN = /\/[^/]+\.[^/]+$/

function parseAcceptHeader(value: string | null) {
  if (!value?.trim()) {
    return [{ index: 0, quality: 1, range: '*/*' }]
  }

  return value
    .split(',')
    .map((part, index) => {
      const [range, ...parameters] = part
        .trim()
        .toLowerCase()
        .split(';')
        .map((valuePart) => valuePart.trim())
      const qualityParameter = parameters.find((parameter) =>
        parameter.startsWith('q='),
      )
      const parsedQuality = qualityParameter
        ? Number(qualityParameter.slice(2))
        : 1

      return {
        index,
        quality:
          Number.isFinite(parsedQuality) &&
          parsedQuality >= 0 &&
          parsedQuality <= 1
            ? parsedQuality
            : 0,
        range,
      }
    })
    .filter((entry) => entry.range)
}

function getRepresentationPreference(
  entries: ReturnType<typeof parseAcceptHeader>,
  representation: string,
) {
  const [representationType] = representation.split('/')
  const matches = entries
    .map((entry) => {
      let specificity = -1
      if (entry.range === representation) {
        specificity = 2
      } else if (entry.range === `${representationType}/*`) {
        specificity = 1
      } else if (entry.range === '*/*') {
        specificity = 0
      }
      return { ...entry, specificity }
    })
    .filter((entry) => entry.specificity >= 0)
    .sort(
      (left, right) =>
        right.specificity - left.specificity || left.index - right.index,
    )

  return matches[0] ?? { index: Number.MAX_SAFE_INTEGER, quality: 0 }
}

export function negotiateDocumentRepresentation(acceptHeader: string | null) {
  const entries = parseAcceptHeader(acceptHeader)
  const preferences = DOCUMENT_REPRESENTATIONS.map((representation) => ({
    representation,
    ...getRepresentationPreference(entries, representation),
  })).filter((preference) => preference.quality > 0)

  const selected = preferences.sort(
    (left, right) =>
      right.quality - left.quality ||
      left.index - right.index ||
      left.representation.localeCompare(right.representation),
  )[0]

  if (!selected) {
    return 'unacceptable'
  }
  return selected.representation === 'text/markdown' ? 'markdown' : 'html'
}

export function acceptsHtml(acceptHeader: string | null) {
  return (
    getRepresentationPreference(parseAcceptHeader(acceptHeader), 'text/html')
      .quality > 0
  )
}

export function isDocumentPath(pathname: string) {
  return !(
    pathname.startsWith('/api/') ||
    pathname.startsWith('/cdn-cgi/') ||
    pathname.startsWith('/img/') ||
    pathname.startsWith('/og/') ||
    pathname.startsWith('/p/') ||
    pathname.startsWith('/_') ||
    FILE_PATH_PATTERN.test(pathname)
  )
}

export function homePageMarkdown(origin: string) {
  return `# Keenpix — image optimization CDN and API

Keenpix is a developer-focused image optimization CDN available as managed cloud or an AGPL-3.0 self-hosted engine. It transforms allowlisted source images, caches variants, and serves responsive AVIF, WebP, JPEG, or PNG output.

## Developer resources

- [Keenpix developer resources](${origin}/developers): API authentication, onboarding, SDK, and machine-readable references.
- [OpenAPI 3.1 specification](${origin}/openapi.json): typed operations, parameters, responses, and API-key security schemes.
- [SDK API documentation](${origin}/docs/reference/sdk-api): authenticated control-plane operations under \`/api/sdk/v1\`.
- [Node SDK on npm](https://www.npmjs.com/package/@keenpix/sdk): official server-side management client.
- [Public health endpoint](${origin}/api/health): unauthenticated JSON service health.

## Agent entry points

- [LLM index](${origin}/llms.txt): concise product, documentation, comparison, and trust links.
- [Full Markdown documentation](${origin}/llms-full.txt): public documentation, blog posts, comparisons, and FAQs.
- [XML sitemap](${origin}/sitemap.xml): canonical public HTML pages.

## Authentication and onboarding

Image delivery URLs are keyless after a project owner configures the project and source allowlist. Control-plane API operations use a project-scoped API key in \`Authorization: Bearer <key>\` or \`X-Keenpix-Api-Key\`. Keenpix does not operate an OAuth authorization server, separate API sandbox, or official CLI. Managed plans offer a self-serve 14-day trial, the full engine can be self-hosted, and integrations can use the REST API or \`@keenpix/sdk\`.

## API contact

- [Email ${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL})
- [WhatsApp ${SUPPORT_WHATSAPP_LABEL}](${SUPPORT_WHATSAPP_URL})

## Product information

- [Pricing](${origin}/pricing)
- [Cloud quickstart](${origin}/docs/getting-started/cloud-quickstart)
- [Self-hosting](${origin}/self-hosted-image-cdn)
- [Security and data handling](${origin}/security)
- [Support and corrections](${origin}/support)
`
}

export function notFoundMarkdown(origin: string) {
  return `# 404 — Keenpix page not found

The requested page does not exist or may have moved.

- [Keenpix developer resources](${origin}/developers)
- [Keenpix documentation](${origin}/docs)
- [LLM index](${origin}/llms.txt)
- [XML sitemap](${origin}/sitemap.xml)
`
}

export function notAcceptableMarkdown(origin: string) {
  return `# 406 — Representation not available

This Keenpix page does not have a Markdown representation. Request \`text/html\`, or continue with one of the machine-readable resources below.

- [LLM index](${origin}/llms.txt)
- [Full Markdown documentation](${origin}/llms-full.txt)
- [OpenAPI specification](${origin}/openapi.json)
`
}

export function markdownResponse(
  body: string,
  method: string,
  status = 200,
  canonicalPathname?: string,
) {
  const link = canonicalPathname
    ? `<${getMarkdownPathname(canonicalPathname)}>; rel="alternate"; type="text/markdown", </llms.txt>; rel="describedby"`
    : undefined
  return new Response(method === 'HEAD' ? null : body, {
    headers: {
      'cache-control': status === 200 ? 'public, max-age=300' : 'no-store',
      'content-type': 'text/markdown; charset=utf-8',
      ...(link ? { link } : {}),
      vary: 'Accept',
    },
    status,
  })
}

export function withMarkdownDiscovery(
  response: Response,
  canonicalPathname: string,
) {
  const headers = new Headers(response.headers)
  const discovery = `<${getMarkdownPathname(canonicalPathname)}>; rel="alternate"; type="text/markdown", </llms.txt>; rel="describedby"`
  const existing = headers.get('link')
  headers.set('link', existing ? `${existing}, ${discovery}` : discovery)
  return varyByAccept(
    new Response(response.body, {
      headers,
      status: response.status,
      statusText: response.statusText,
    }),
  )
}

export function varyByAccept(response: Response) {
  const headers = new Headers(response.headers)
  const values = (headers.get('vary') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  if (!values.some((value) => value.toLowerCase() === 'accept')) {
    values.unshift('Accept')
  }
  headers.set('vary', values.join(', '))

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  })
}
