import { createServer } from 'node:http'
import {
  createPrewarmWorker,
  createQueueWorkerConnection,
} from '@keenpix/bullmq'
import { createLogger, flushLogger, initializeLogger } from '@keenpix/logger'
import { env } from './env'
import { getWorkerHealth } from './health'
import { createPrewarmProcessor } from './process-prewarm'

initializeLogger({
  environment: process.env.NODE_ENV,
  level: env.LOG_LEVEL,
  logDir: env.KEENPIX_LOG_DIR,
  service: 'keenpix-worker',
})

const logger = createLogger()
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
let shuttingDown = false

const healthServer = createServer(async (request, response) => {
  if (request.url !== '/health') {
    response.writeHead(404).end()
    return
  }

  const health = await getWorkerHealth({
    isShuttingDown: () => shuttingDown,
    isWorkerRunning: () => worker.isRunning(),
    pingQueue: () => connection.ping(),
  })
  response
    .writeHead(health.ready ? 200 : 503, {
      'Content-Type': 'application/json',
    })
    .end(JSON.stringify(health))
})

healthServer.listen(env.KEENPIX_WORKER_PORT, '0.0.0.0', () => {
  logger.info(
    { port: env.KEENPIX_WORKER_PORT },
    'queue worker health server started',
  )
})

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
    await connection.quit()
    logger.info({ signal }, 'queue worker stopped')
  } finally {
    await flushLogger()
  }
}

function handleSignal(signal: NodeJS.Signals) {
  return shutdown(signal).catch((error) => {
    logger.error({ error, signal }, 'queue worker shutdown failed')
    process.exitCode = 1
  })
}

async function exitAfterFlush() {
  await flushLogger().catch(() => undefined)
  process.exit(1)
}

process.once('SIGTERM', () => handleSignal('SIGTERM'))
process.once('SIGINT', () => handleSignal('SIGINT'))
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
