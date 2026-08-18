import { type Processor, Worker } from 'bullmq'
import type IORedis from 'ioredis'
import { PREWARM_QUEUE_NAME, type PrewarmTransformJob } from '../jobs/prewarm'

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
