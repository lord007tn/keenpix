import dayjs from 'dayjs'
import { checkDatabaseHealth } from '@/data-access/health'
import { getCacheRuntimeStats } from '@/lib/cache/cache'
import { getQueueStats } from '@/lib/queue/transform-queue'

export async function getHealthStatus() {
  const started = performance.now()

  try {
    const database = await checkDatabaseHealth()
    return {
      ok: true,
      service: 'keenpix',
      status: 'ok',
      timestamp: dayjs().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      checks: {
        cache: getCacheRuntimeStats(),
        database,
        transformQueue: getQueueStats(),
      },
      latencyMs: Math.round(performance.now() - started),
    }
  } catch {
    return {
      ok: false,
      service: 'keenpix',
      status: 'degraded',
      timestamp: dayjs().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      checks: {
        cache: getCacheRuntimeStats(),
        database: { ok: false },
        transformQueue: getQueueStats(),
      },
      latencyMs: Math.round(performance.now() - started),
    }
  }
}
