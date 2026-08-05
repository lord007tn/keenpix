import { createFileRoute } from '@tanstack/react-router'
import { handleSdkRequest } from './-sdk/router'

export const Route = createFileRoute('/api/sdk/$')({
  server: {
    handlers: {
      DELETE: ({ params, request }) =>
        handleSdkRequest(request, params._splat, 'DELETE'),
      GET: ({ params, request }) =>
        handleSdkRequest(request, params._splat, 'GET'),
      PATCH: ({ params, request }) =>
        handleSdkRequest(request, params._splat, 'PATCH'),
      POST: ({ params, request }) =>
        handleSdkRequest(request, params._splat, 'POST'),
    },
  },
})
