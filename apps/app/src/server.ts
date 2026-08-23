import handler, { createServerEntry } from '@tanstack/react-start/server-entry'
import {
  acceptsHtml,
  homePageMarkdown,
  isDocumentPath,
  markdownResponse,
  negotiateDocumentRepresentation,
  notAcceptableMarkdown,
  notFoundMarkdown,
  varyByAccept,
} from '@/server/agent-negotiation'

export default createServerEntry({
  async fetch(request, options) {
    if (
      (request.method !== 'GET' && request.method !== 'HEAD') ||
      !isDocumentPath(new URL(request.url).pathname)
    ) {
      return handler.fetch(request, options)
    }

    const url = new URL(request.url)
    const representation = negotiateDocumentRepresentation(
      request.headers.get('accept'),
    )

    if (url.pathname === '/' && representation === 'markdown') {
      return markdownResponse(homePageMarkdown(url.origin), request.method)
    }

    if (representation === 'unacceptable') {
      return markdownResponse(
        notAcceptableMarkdown(url.origin),
        request.method,
        406,
      )
    }

    if (representation === 'markdown') {
      const headers = new Headers(request.headers)
      headers.set('accept', 'text/html')
      const htmlResponse = await handler.fetch(
        new Request(request.url, {
          headers,
          method: request.method,
          signal: request.signal,
        }),
        options,
      )

      if (htmlResponse.status === 404) {
        return markdownResponse(
          notFoundMarkdown(url.origin),
          request.method,
          404,
        )
      }
      if (!acceptsHtml(request.headers.get('accept'))) {
        return markdownResponse(
          notAcceptableMarkdown(url.origin),
          request.method,
          406,
        )
      }
      return varyByAccept(htmlResponse)
    }

    const response = await handler.fetch(request, options)
    return varyByAccept(response)
  },
})
