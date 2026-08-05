import { logger } from '@/lib/logger/logger'
import { getQueueStats } from '@/lib/queue/transform-queue'

// Process-wide "we're going down" flag. The health endpoint reads it so an
// orchestrator (Coolify / a load balancer) sees the instance as unhealthy and
// stops routing to it while in-flight work drains.
let shuttingDown = false

export function isShuttingDown(): boolean {
  return shuttingDown
}

export function beginShutdown(): void {
  shuttingDown = true
}

const DEFAULT_DRAIN_TIMEOUT_MS = 25_000
const POLL_INTERVAL_MS = 200

// Wait for the transform queue (the heavy fetch+libvips work) to finish its
// active + queued jobs before the process exits, so a rolling deploy doesn't drop
// requests mid-transform. Bounded — returns after the timeout even if jobs remain
// (better to exit than block the deploy indefinitely).
export async function drainTransformQueue(
  timeoutMs = DEFAULT_DRAIN_TIMEOUT_MS,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const { active, queued } = getQueueStats()
    if (active === 0 && queued === 0) {
      return
    }
    if (Date.now() >= deadline) {
      logger.warn(
        { active, queued },
        'graceful shutdown: drain timed out with transforms still in flight',
      )
      return
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }
}
