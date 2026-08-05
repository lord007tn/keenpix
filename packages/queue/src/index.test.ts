import { describe, expect, it } from 'vitest'
import {
  createQueueProducerConnection,
  createQueueWorkerConnection,
  PREWARM_JOB_NAME,
  PREWARM_QUEUE_NAME,
} from './index'

describe('queue connections', () => {
  it('keeps producers fail-fast and workers reconnecting', () => {
    const producer = createQueueProducerConnection('redis://127.0.0.1:6379')
    const worker = createQueueWorkerConnection('redis://127.0.0.1:6379')

    expect(producer.status).toBe('wait')
    expect(producer.options.maxRetriesPerRequest).toBe(1)
    expect(worker.status).toBe('wait')
    expect(worker.options.maxRetriesPerRequest).toBeNull()
    expect(PREWARM_QUEUE_NAME).toBe('keenpix-prewarm')
    expect(PREWARM_JOB_NAME).toBe('transform')

    producer.disconnect()
    worker.disconnect()
  })
})
