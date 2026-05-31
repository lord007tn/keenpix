import os from 'node:os'
import { AsyncQueuer } from '@tanstack/pacer'
import { env } from '@/env/server'
import { TransformError } from '@/errors/transform'

/** Max simultaneous fetch+transform jobs (the memory/CPU-heavy path). Excess
 * requests queue; past MAX_QUEUE we shed load with 503 rather than OOM. */
const DEFAULT_MAX_CONCURRENCY = Math.max(2, os.cpus().length)
const MAX_CONCURRENT = Math.max(
  1,
  env.KEENPIX_MAX_CONCURRENCY ?? DEFAULT_MAX_CONCURRENCY,
)
const MAX_QUEUE = env.KEENPIX_MAX_QUEUE

interface QueuedTransform {
  run: () => Promise<void>
}

const transformQueue = new AsyncQueuer<QueuedTransform>(
  async (item) => {
    await item.run()
  },
  {
    concurrency: MAX_CONCURRENT,
    key: 'keenpix-transform',
    maxSize: MAX_QUEUE,
    started: true,
    throwOnError: false,
  },
)

export function runQueuedJob<T>(work: () => Promise<T>) {
  return new Promise<T>((resolve, reject) => {
    const accepted = transformQueue.addItem({
      run: async () => {
        try {
          resolve(await work())
        } catch (error) {
          reject(error)
        }
      },
    })

    if (!accepted) {
      reject(new TransformError('Server busy', 503))
    }
  })
}

export function getQueueStats() {
  const state = transformQueue.store.state

  return {
    active: state.activeItems.length,
    concurrency: MAX_CONCURRENT,
    queued: state.items.length,
    maxQueue: MAX_QUEUE,
    rejected: state.rejectionCount,
    status: state.status,
  }
}
