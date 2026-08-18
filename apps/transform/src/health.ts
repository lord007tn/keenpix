import dayjs from 'dayjs'

export async function getTransformHealth(input: {
  environment?: string
  probeCache: () => Promise<boolean>
  probeClickhouse?: () => Promise<unknown>
  probeDatabase: () => Promise<boolean>
}) {
  const [database, cache, clickhouse] = await Promise.all([
    input.probeDatabase(),
    input.probeCache(),
    input.probeClickhouse?.(),
  ])
  const status = database && cache ? 'healthy' : 'unhealthy'
  return {
    components: {
      cache,
      ...(clickhouse === undefined ? {} : { clickhouse }),
      database,
    },
    ...(input.environment ? { environment: input.environment } : {}),
    status,
    timestamp: dayjs().toISOString(),
  }
}
