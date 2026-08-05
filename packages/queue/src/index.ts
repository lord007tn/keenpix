import { type Processor, Queue, Worker } from 'bullmq'
import IORedis from 'ioredis'

export const PREWARM_QUEUE_NAME = 'keenpix-prewarm'
export const PREWARM_JOB_NAME = 'transform'

export interface PrewarmTransformJob {
  accept: string
  params: Record<string, string>
  projectId: string
  src: string
}

export function createQueueProducerConnection(url: string) {
  return new IORedis(url, {
    connectTimeout: 3000,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  })
}

export function createQueueWorkerConnection(url: string) {
  return new IORedis(url, {
    connectTimeout: 10_000,
    lazyConnect: true,
    maxRetriesPerRequest: null,
  })
}

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

export function createPrewarmWorker(
  connection: IORedis,
  concurrency: number,
  processor: Processor<PrewarmTransformJob>,
) {
  return new Worker<PrewarmTransformJob>(PREWARM_QUEUE_NAME, processor, {
    concurrency,
    connection,
  })
}

export function addPrewarmJobs(
  queue: Queue<PrewarmTransformJob>,
  jobs: PrewarmTransformJob[],
) {
  return queue.addBulk(jobs.map((data) => ({ data, name: PREWARM_JOB_NAME })))
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
