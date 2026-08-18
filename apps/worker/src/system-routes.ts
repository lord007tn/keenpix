import { workbench } from '@getworkbench/hono'
import type { createPrewarmQueue } from '@keenpix/bullmq'
import dayjs from 'dayjs'
import { Hono } from 'hono'
import type { getWorkerHealthDetails } from './health'

const WORKBENCH_BASE_PATH = '/workbench'

interface SystemRoutesOptions {
  getHealth: () => ReturnType<typeof getWorkerHealthDetails>
  queue: ReturnType<typeof createPrewarmQueue>
  workbenchAuth?: {
    password: string
    username: string
  }
}

export function createSystemRoutes(options: SystemRoutesOptions) {
  const workbenchApp = workbench({
    alerts: { enabled: false },
    auth: options.workbenchAuth,
    basePath: WORKBENCH_BASE_PATH,
    queues: [options.queue],
    title: 'Keenpix Worker',
  })

  return new Hono()
    .get('/health/live', (context) =>
      context.json({ status: 'healthy', timestamp: dayjs().toISOString() }),
    )
    .get('/health/ready', async (context) => {
      const health = await options.getHealth()
      return context.json(
        { status: health.status, timestamp: health.timestamp },
        health.status === 'unhealthy' ? 503 : 200,
      )
    })
    .get('/health', async (context) => {
      const health = await options.getHealth()
      return context.json(
        { status: health.status, timestamp: health.timestamp },
        health.status === 'unhealthy' ? 503 : 200,
      )
    })
    .get('/health/details', async (context) => {
      const health = await options.getHealth()
      return context.json(health, health.status === 'unhealthy' ? 503 : 200)
    })
    .route(WORKBENCH_BASE_PATH, workbenchApp)
}
