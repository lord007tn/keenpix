import handler, { createServerEntry } from '@tanstack/react-start/server-entry'
import {
  markdownResponse,
  negotiateDocumentRepresentation,
  notAcceptableMarkdown,
  notFoundMarkdown,
  withMarkdownDiscovery,
} from '@/server/agent-negotiation'
import { getPublicMarkdown } from '@/server/public-markdown'
import {
  getCanonicalPathname,
  isPublicKnowledgePath,
} from '@/shared/markdown-discovery'

export default createServerEntry({
  async fetch(request, options) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return handler.fetch(request, options)
    }

    const url = new URL(request.url)
    const explicitMarkdownPath = getCanonicalPathname(url.pathname)
    const canonicalPathname = explicitMarkdownPath ?? url.pathname
    const publicKnowledgePath = isPublicKnowledgePath(canonicalPathname)

    if (explicitMarkdownPath) {
      const markdown = publicKnowledgePath
        ? await getPublicMarkdown(canonicalPathname, url.origin)
        : null
      return markdownResponse(
        markdown ?? notFoundMarkdown(url.origin),
        request.method,
        markdown ? 200 : 404,
        markdown ? canonicalPathname : undefined,
      )
    }

    if (!publicKnowledgePath) {
      return handler.fetch(request, options)
    }

    const representation = negotiateDocumentRepresentation(
      request.headers.get('accept'),
    )

    if (representation === 'unacceptable') {
      return markdownResponse(
        notAcceptableMarkdown(url.origin),
        request.method,
        406,
      )
    }

    if (representation === 'markdown') {
      const markdown = await getPublicMarkdown(canonicalPathname, url.origin)
      return markdownResponse(
        markdown ?? notFoundMarkdown(url.origin),
        request.method,
        markdown ? 200 : 404,
        markdown ? canonicalPathname : undefined,
      )
    }

    const response = await handler.fetch(request, options)
    return response.status >= 200 && response.status < 400
      ? withMarkdownDiscovery(response, canonicalPathname)
      : response
  },
})
