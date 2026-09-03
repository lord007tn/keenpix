import handler, { createServerEntry } from '@tanstack/react-start/server-entry'
import { getAppUrl } from '@/server/deployment'
import { handleDocumentRequest } from '@/server/document-request'

export default createServerEntry({
  fetch(request, options) {
    return handleDocumentRequest({
      canonicalOrigin: getAppUrl(),
      loadMarkdown: async (pathname, origin) => {
        const { getPublicMarkdown } = await import('@/server/public-markdown')
        return getPublicMarkdown(pathname, origin)
      },
      request,
      route: () => Promise.resolve(handler.fetch(request, options)),
    })
  },
})
