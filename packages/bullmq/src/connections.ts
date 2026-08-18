import IORedis from 'ioredis'

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
