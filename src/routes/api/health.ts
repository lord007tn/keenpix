import { createFileRoute } from '@tanstack/react-router'
import { checkDatabaseHealth } from '@/data-access/health'
import { getCacheRuntimeStats } from '@/lib/cdn/cache'
import { getTransformQueueStats } from '@/lib/transform/concurrency'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: async () => {
        const started = Date.now()
        try {
          const database = await checkDatabaseHealth()
          return Response.json(
            {
              ok: true,
              service: 'keenpix',
              status: 'ok',
              timestamp: new Date().toISOString(),
              uptimeSeconds: Math.round(process.uptime()),
              checks: {
                cache: getCacheRuntimeStats(),
                database,
                transformQueue: getTransformQueueStats(),
              },
              latencyMs: Date.now() - started,
            },
            { headers: { 'cache-control': 'no-store' } },
          )
        } catch {
          return Response.json(
            {
              ok: false,
              service: 'keenpix',
              status: 'degraded',
              timestamp: new Date().toISOString(),
              checks: {
                cache: getCacheRuntimeStats(),
                database: { ok: false },
                transformQueue: getTransformQueueStats(),
              },
              latencyMs: Date.now() - started,
            },
            { headers: { 'cache-control': 'no-store' }, status: 503 },
          )
        }
      },
    },
  },
})
