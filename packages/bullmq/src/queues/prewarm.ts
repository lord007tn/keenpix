import { createHash } from 'node:crypto'
import { Queue } from 'bullmq'
import type IORedis from 'ioredis'
import {
  PREWARM_JOB_NAME,
  PREWARM_QUEUE_NAME,
  type PrewarmTransformJob,
} from '../jobs/prewarm'

export function createPrewarmQueue(connection: IORedis) {
  return new Queue<PrewarmTransformJob>(PREWARM_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { delay: 1000, type: 'exponential' },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 7 * 24 * 60 * 60, count: 5000 },
    },
  })
}

export function addPrewarmJobs(
  queue: Queue<PrewarmTransformJob>,
  jobs: PrewarmTransformJob[],
) {
  return queue.addBulk(
    jobs.map((data) => ({
      data,
      name: PREWARM_JOB_NAME,
      opts: {
        jobId: createHash('sha256')
          .update(
            JSON.stringify({
              params: data.params,
              projectId: data.projectId,
              src: data.src,
              version: data.version,
            }),
          )
          .digest('hex'),
      },
    })),
  )
}

export async function getPrewarmQueueStats(queue: Queue<PrewarmTransformJob>) {
  const counts = await queue.getJobCounts(
    'active',
    'waiting',
    'delayed',
    'failed',
  )
  return {
    active: counts.active,
    delayed: counts.delayed,
    failed: counts.failed,
    queued: counts.waiting + counts.delayed,
    status: 'ready' as const,
    waiting: counts.waiting,
  }
}
