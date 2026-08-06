import { serve } from '@hono/node-server'
import {
  createPrewarmQueue,
  createPrewarmWorker,
  createQueueProducerConnection,
  createQueueWorkerConnection,
} from '@keenpix/bullmq'
import {
  createLogger,
  flushLogger,
  initializeLogger,
  runWithLogContext,
} from '@keenpix/logger'
import packageJson from '../package.json' with { type: 'json' }
import { env } from './env'
import { getWorkerHealthDetails } from './health'
import { createPrewarmProcessor } from './process-prewarm'
import { createSystemRoutes } from './system-routes'

initializeLogger({
  environment: env.NODE_ENV,
  level: env.LOG_LEVEL,
  logDir: env.KEENPIX_LOG_DIR,
  service: 'keenpix-worker',
  version: packageJson.version,
})

const logger = createLogger()
const workerConnection = createQueueWorkerConnection(env.KEENPIX_QUEUE_URL)
const queueConnection = createQueueProducerConnection(env.KEENPIX_QUEUE_URL)
workerConnection.on('error', (error) => {
  logger.error({ error }, 'worker queue connection error')
})
queueConnection.on('error', (error) => {
  logger.error({ error }, 'workbench queue connection error')
})
const processPrewarm = createPrewarmProcessor({
  appUrl: env.KEENPIX_APP_URL,
  secret: env.KEENPIX_WORKER_SECRET,
  timeoutMs: env.KEENPIX_WORKER_TIMEOUT_MS,
})
const worker = createPrewarmWorker(
  workerConnection,
  env.KEENPIX_WORKER_CONCURRENCY,
  (job) =>
    runWithLogContext(
      {
        jobId: job.id,
        jobName: job.name,
        queue: job.queueName,
      },
      () => processPrewarm(job.data),
    ),
)
const prewarmQueue = createPrewarmQueue(queueConnection)
let shuttingDown = false

const systemRoutes = createSystemRoutes({
  getHealth: () =>
    getWorkerHealthDetails({
      environment: env.NODE_ENV,
      isShuttingDown: () => shuttingDown,
      isWorkerRunning: () => worker.isRunning(),
      pingQueue: () => workerConnection.ping(),
    }),
  queue: prewarmQueue,
  workbenchAuth:
    env.KEENPIX_WORKBENCH_USERNAME && env.KEENPIX_WORKBENCH_PASSWORD
      ? {
          password: env.KEENPIX_WORKBENCH_PASSWORD,
          username: env.KEENPIX_WORKBENCH_USERNAME,
        }
      : undefined,
})
const healthServer = serve(
  {
    fetch: systemRoutes.fetch,
    hostname: '0.0.0.0',
    port: env.KEENPIX_WORKER_PORT,
  },
  (info) => {
    logger.info(
      {
        health: `http://${info.address}:${info.port}/health`,
        workbench: `http://${info.address}:${info.port}/workbench`,
      },
      'queue worker ops server started',
    )
  },
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
  if (shuttingDown) {
    return
  }
  shuttingDown = true
  logger.info({ signal }, 'stopping queue worker')
  try {
    await Promise.all([
      worker.close(),
      prewarmQueue.close(),
      healthServer.listening
        ? new Promise((resolve, reject) => {
            healthServer.close((error) => {
              if (error) {
                reject(error)
                return
              }
              resolve(undefined)
            })
          })
        : Promise.resolve(),
    ])
    await Promise.all([workerConnection.quit(), queueConnection.quit()])
    logger.info({ signal }, 'queue worker stopped')
  } finally {
    await flushLogger()
  }
}

async function handleSignal(signal: NodeJS.Signals) {
  try {
    await shutdown(signal)
    process.exit(0)
  } catch (error) {
    logger.error({ error, signal }, 'queue worker shutdown failed')
    await flushLogger().catch(() => undefined)
    process.exit(1)
  }
}

async function exitAfterFlush() {
  await flushLogger().catch(() => undefined)
  process.exit(1)
}

process.once('SIGTERM', () => {
  handleSignal('SIGTERM').catch(() => process.exit(1))
})
process.once('SIGINT', () => {
  handleSignal('SIGINT').catch(() => process.exit(1))
})
process.once('uncaughtException', (error) => {
  logger.error(error, 'uncaught exception')
  return exitAfterFlush()
})
process.once('unhandledRejection', (reason) => {
  logger.error({ reason }, 'unhandled rejection')
  return exitAfterFlush()
})

logger.info(
  { concurrency: env.KEENPIX_WORKER_CONCURRENCY },
  'queue worker started',
)
