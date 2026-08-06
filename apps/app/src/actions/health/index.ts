import { pingClickhouse } from '@keenpix/clickhouse/client'
import dayjs from 'dayjs'
import { ensureResourceSampler } from '@/actions/admin/operations'
import { checkDatabaseHealth } from '@/data-access/health'
import { getPrewarmQueueStats } from '@/integrations/bullmq/prewarm'
import { getCacheRuntimeStats, probeDurableCache } from '@/lib/cache/cache'
import { isCloud } from '@/server/deployment'
import { isShuttingDown } from '@/server/shutdown'

export async function getHealthStatus() {
  const started = performance.now()
  const prewarmQueue = await getPrewarmQueueStats()

  // Draining for a rolling deploy: report un-ready (503) BEFORE touching the DB so
  // the orchestrator stops routing new traffic here while in-flight transforms
  // finish. Honest even mid-drain, and cheap — no subsystem probes needed.
  if (isShuttingDown()) {
    return {
      ok: false,
      service: 'keenpix',
      status: 'shutting_down',
      timestamp: dayjs().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      checks: { prewarmQueue },
      latencyMs: Math.round(performance.now() - started),
    }
  }

  // The Docker healthcheck hits this every ~10s, so it doubles as the keep-alive
  // that guarantees the resource sampler is running shortly after boot.
  ensureResourceSampler()

  // Cloud-only load-bearing subsystems. Best-effort + NON-fatal: a ClickHouse/S3
  // blip degrades the app (it falls back to Postgres rollups + disk cache) but
  // the instance is still healthy, so the LB must not kill it over these.
  const [clickhouse, objectStorage] = isCloud()
    ? await Promise.all([
        pingClickhouse(),
        probeDurableCache() ?? Promise.resolve(null),
      ])
    : [null, null]
  const subsystems = {
    ...(clickhouse ? { clickhouse } : {}),
    ...(objectStorage ? { objectStorage } : {}),
  }

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
        prewarmQueue,
        ...subsystems,
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
        prewarmQueue,
        ...subsystems,
      },
      latencyMs: Math.round(performance.now() - started),
    }
  }
}
