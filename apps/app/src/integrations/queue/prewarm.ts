import {
  addPrewarmJobs,
  createPrewarmQueue,
  createQueueProducerConnection,
  type PrewarmTransformJob,
  getPrewarmQueueStats as readPrewarmQueueStats,
} from '@keenpix/queue'
import { env } from '@/env/server'
import { errorContext, logger } from '@/lib/logger/logger'

const connection = createQueueProducerConnection(env.KEENPIX_QUEUE_URL)
const queue = createPrewarmQueue(connection)
let connectionErrorLogged = false

function logConnectionError(error: unknown) {
  if (connectionErrorLogged) {
    return
  }
  connectionErrorLogged = true
  logger.warn(errorContext(error), 'durable prewarm queue unavailable')
}

connection.on('error', logConnectionError)
queue.on('error', logConnectionError)

export function enqueuePrewarmJobs(jobs: PrewarmTransformJob[]) {
  return addPrewarmJobs(queue, jobs)
}

export async function getPrewarmQueueStats() {
  try {
    const stats = await readPrewarmQueueStats(queue)
    connectionErrorLogged = false
    return stats
  } catch {
    return {
      active: 0,
      delayed: 0,
      failed: 0,
      queued: 0,
      status: 'unavailable' as const,
      waiting: 0,
    }
  }
}

export async function closePrewarmQueue() {
  await queue.close()
  await connection.quit().catch(() => undefined)
}
