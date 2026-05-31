import { createFileRoute } from '@tanstack/react-router'
import { handleTransform } from '@/actions/transform/handle-transform'

export const Route = createFileRoute('/api/keenpix')({
  server: {
    handlers: {
      GET: ({ request }: { request: Request }) => handleTransform(request),
    },
  },
})
