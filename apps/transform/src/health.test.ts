import { describe, expect, it, vi } from 'vitest'
import { getTransformHealth } from './health'

describe('getTransformHealth', () => {
  it('requires the database and cache while reporting ClickHouse separately', async () => {
    await expect(
      getTransformHealth({
        environment: 'test',
        probeCache: vi.fn().mockResolvedValue(true),
        probeClickhouse: vi.fn().mockResolvedValue(false),
        probeDatabase: vi.fn().mockResolvedValue(true),
      }),
    ).resolves.toMatchObject({
      components: { cache: true, clickhouse: false, database: true },
      environment: 'test',
      status: 'healthy',
    })
  })

  it('fails readiness when the durable cache is unavailable', async () => {
    await expect(
      getTransformHealth({
        probeCache: vi.fn().mockResolvedValue(false),
        probeDatabase: vi.fn().mockResolvedValue(true),
      }),
    ).resolves.toMatchObject({ status: 'unhealthy' })
  })
})
