import { createFileRoute } from '@tanstack/react-router'
import { handleTransformRequest } from '@/functions/transform'

export const Route = createFileRoute('/img/$')({
  server: {
    handlers: {
      GET: ({
        params,
        request,
      }: {
        params: { _splat?: string }
        request: Request
      }) => handleTransformRequest(request, params._splat),
    },
  },
})
