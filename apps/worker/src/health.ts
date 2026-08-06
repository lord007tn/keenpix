interface WorkerHealthDependencies {
  isShuttingDown: () => boolean
  isWorkerRunning: () => boolean
  pingQueue: () => Promise<string>
}

export async function getWorkerHealth(dependencies: WorkerHealthDependencies) {
  try {
    const queue = await dependencies.pingQueue()
    const ready =
      !dependencies.isShuttingDown() &&
      dependencies.isWorkerRunning() &&
      queue === 'PONG'
    return {
      queue: ready ? ('ready' as const) : ('unavailable' as const),
      ready,
    }
  } catch {
    return { queue: 'unavailable' as const, ready: false }
  }
}
