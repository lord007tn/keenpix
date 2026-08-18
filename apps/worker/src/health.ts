import dayjs from 'dayjs'

const HEALTH_CHECK_TIMEOUT_MS = 2000

interface WorkerHealthDependencies {
  environment: string
  isShuttingDown: () => boolean
  isWorkerRunning: () => boolean
  pingQueue: () => Promise<string>
  uptime?: () => number
}

interface HealthComponent {
  error?: string
  latencyMs?: number
  status: 'healthy' | 'unhealthy'
}

async function checkQueue(pingQueue: () => Promise<string>) {
  let timeout: NodeJS.Timeout | undefined
  const startedAt = performance.now()

  try {
    const response = await Promise.race([
      pingQueue(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error('Health check timed out')),
          HEALTH_CHECK_TIMEOUT_MS,
        )
      }),
    ])
    if (response !== 'PONG') {
      throw new Error('Unexpected queue response')
    }
    return {
      latencyMs: Math.round(performance.now() - startedAt),
      status: 'healthy' as const,
    }
  } catch (error) {
    return {
      error:
        error instanceof Error && error.message === 'Health check timed out'
          ? error.message
          : 'Connection failed',
      status: 'unhealthy' as const,
    }
  } finally {
    if (timeout) {
      clearTimeout(timeout)
    }
  }
}

export async function getWorkerHealthDetails(
  dependencies: WorkerHealthDependencies,
) {
  const queue = await checkQueue(dependencies.pingQueue)
  const worker: HealthComponent =
    !dependencies.isShuttingDown() && dependencies.isWorkerRunning()
      ? { status: 'healthy' }
      : { error: 'Worker is not accepting jobs', status: 'unhealthy' }
  const status =
    queue.status === 'healthy' && worker.status === 'healthy'
      ? ('healthy' as const)
      : ('unhealthy' as const)

  return {
    components: { queue, worker },
    environment: dependencies.environment,
    status,
    timestamp: dayjs().toISOString(),
    uptime: (dependencies.uptime ?? process.uptime)(),
  }
}
