import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '@/db'

/** Readiness probe: 200 when the DB is reachable, 503 otherwise. Used by the
 * container healthcheck so orchestration waits for a genuinely-ready app. */
export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: async () => {
        try {
          await prisma.$queryRaw`SELECT 1`
          return Response.json({ status: 'ok' })
        } catch {
          return Response.json({ status: 'degraded' }, { status: 503 })
        }
      },
    },
  },
})
