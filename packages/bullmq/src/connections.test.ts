import { describe, expect, it } from 'vitest'
import {
  createQueueProducerConnection,
  createQueueWorkerConnection,
} from './connections'

describe('BullMQ connections', () => {
  it('gives producers a fail-fast contract and workers a persistent contract', () => {
    const producer = createQueueProducerConnection('redis://127.0.0.1:6379')
    const worker = createQueueWorkerConnection('redis://127.0.0.1:6379')
    expect(producer.options.lazyConnect).toBe(true)
    expect(producer.options.maxRetriesPerRequest).toBe(1)
    expect(worker.options.lazyConnect).toBe(true)
    expect(worker.options.maxRetriesPerRequest).toBeNull()

    producer.disconnect()
    worker.disconnect()
  })
})
