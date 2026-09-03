import {
  markdownResponse,
  negotiateDocumentRepresentation,
  notAcceptableMarkdown,
  notFoundMarkdown,
  withMarkdownDiscovery,
} from '@/server/agent-negotiation'
import {
  getCanonicalPathname,
  isPublicKnowledgePath,
} from '@/shared/markdown-discovery'

interface DocumentRequestOptions {
  canonicalOrigin: string
  loadMarkdown: (pathname: string, origin: string) => Promise<string | null>
  request: Request
  route: () => Promise<Response>
}

export async function handleDocumentRequest({
  canonicalOrigin,
  loadMarkdown,
  request,
  route,
}: DocumentRequestOptions) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return route()
  }

  const url = new URL(request.url)
  const explicitMarkdownPath = getCanonicalPathname(url.pathname)
  const canonicalPathname = explicitMarkdownPath ?? url.pathname
  const publicKnowledgePath = isPublicKnowledgePath(canonicalPathname)

  if (explicitMarkdownPath) {
    const markdown = publicKnowledgePath
      ? await loadMarkdown(canonicalPathname, canonicalOrigin)
      : null
    return markdownResponse(
      markdown ?? notFoundMarkdown(canonicalOrigin),
      request.method,
      markdown ? 200 : 404,
      markdown ? canonicalPathname : undefined,
    )
  }

  if (!publicKnowledgePath) {
    return route()
  }

  const representation = negotiateDocumentRepresentation(
    request.headers.get('accept'),
  )

  if (representation === 'unacceptable') {
    return markdownResponse(
      notAcceptableMarkdown(canonicalOrigin),
      request.method,
      406,
    )
  }

  if (representation === 'markdown') {
    const markdown = await loadMarkdown(canonicalPathname, canonicalOrigin)
    return markdownResponse(
      markdown ?? notFoundMarkdown(canonicalOrigin),
      request.method,
      markdown ? 200 : 404,
      markdown ? canonicalPathname : undefined,
    )
  }

  const response = await route()
  return response.status >= 200 && response.status < 400
    ? withMarkdownDiscovery(response, canonicalPathname)
    : response
}
