import { serve } from '@hono/node-server'
import { createLogger, flushLogger, initializeLogger } from '@keenpix/logger'
import packageJson from '../package.json' with { type: 'json' }
import { createTransformApp } from './app'
import { env } from './env'
import { flushTransformAnalytics } from './transform'

initializeLogger({
  environment: env.NODE_ENV,
  level: env.LOG_LEVEL,
  logDir: env.KEENPIX_LOG_DIR,
  service: 'keenpix-transform',
  version: packageJson.version,
})

const logger = createLogger()
const app = createTransformApp()
const server = serve({
  fetch: app.fetch,
  hostname: '0.0.0.0',
  port: env.KEENPIX_TRANSFORM_PORT,
})
let shuttingDown = false

async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) {
    return
  }
  shuttingDown = true
  logger.info({ signal }, 'stopping transform service')
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
  await flushTransformAnalytics()
  await flushLogger()
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    shutdown(signal)
      .then(() => process.exit(0))
      .catch((error) => {
        logger.error({ error, signal }, 'transform service shutdown failed')
        process.exit(1)
      })
  })
}

logger.info({ port: env.KEENPIX_TRANSFORM_PORT }, 'transform service started')
