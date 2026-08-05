import {
  createPrewarmWorker,
  createQueueWorkerConnection,
} from '@keenpix/queue'
import pino from 'pino'
import { env } from './env'
import { createPrewarmProcessor } from './process-prewarm'

const logger = pino({ level: env.LOG_LEVEL, name: 'keenpix-worker' })
const connection = createQueueWorkerConnection(env.KEENPIX_QUEUE_URL)
connection.on('error', (error) => {
  logger.error({ error }, 'queue connection error')
})
const processPrewarm = createPrewarmProcessor({
  appUrl: env.KEENPIX_APP_URL,
  secret: env.KEENPIX_WORKER_SECRET,
  timeoutMs: env.KEENPIX_WORKER_TIMEOUT_MS,
})
const worker = createPrewarmWorker(
  connection,
  env.KEENPIX_WORKER_CONCURRENCY,
  async (job) => processPrewarm(job.data),
)

worker.on('completed', (job) => {
  logger.debug({ jobId: job.id }, 'prewarm transform completed')
})
worker.on('failed', (job, error) => {
  logger.error({ error, jobId: job?.id }, 'prewarm transform failed')
})
worker.on('error', (error) => {
  logger.error({ error }, 'queue worker error')
})

async function shutdown(signal: NodeJS.Signals) {
  logger.info({ signal }, 'stopping queue worker')
  await worker.close()
  await connection.quit()
}

process.once('SIGTERM', () => shutdown('SIGTERM'))
process.once('SIGINT', () => shutdown('SIGINT'))

logger.info(
  { concurrency: env.KEENPIX_WORKER_CONCURRENCY },
  'queue worker started',
)
