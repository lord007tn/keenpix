import { createFileRoute } from '@tanstack/react-router'
import { handleDemoRequest } from '@/functions/demo'

export const Route = createFileRoute('/demo/img/$')({
  server: {
    handlers: {
      GET: ({ request, params }) => handleDemoRequest(request, params._splat),
    },
  },
})
