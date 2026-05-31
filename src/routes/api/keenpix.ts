import { createFileRoute } from '@tanstack/react-router'
import { handleTransformRequest } from '@/functions/transform'

export const Route = createFileRoute('/api/keenpix')({
  server: {
    handlers: {
      GET: ({ request }: { request: Request }) =>
        handleTransformRequest(request),
    },
  },
})
