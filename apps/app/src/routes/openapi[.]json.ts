import { createFileRoute } from '@tanstack/react-router'
import { OPENAPI_DOCUMENT } from '@/shared/openapi'

export const Route = createFileRoute('/openapi.json')({
  server: {
    handlers: {
      GET: () =>
        Response.json(OPENAPI_DOCUMENT, {
          headers: {
            'access-control-allow-origin': '*',
            'cache-control': 'public, max-age=3600',
          },
        }),
    },
  },
})
