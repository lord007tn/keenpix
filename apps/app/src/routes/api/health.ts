import { createFileRoute } from '@tanstack/react-router'
import { getHealthStatus } from '@/actions/health'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: async () => {
        const health = await getHealthStatus()
        return Response.json(health, {
          headers: { 'cache-control': 'no-store' },
          status: health.ok ? 200 : 503,
        })
      },
    },
  },
})
