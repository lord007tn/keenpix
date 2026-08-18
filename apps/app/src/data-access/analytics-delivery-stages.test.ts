import { beforeEach, describe, expect, it, vi } from 'vitest'

const groupBy = vi.hoisted(() => vi.fn())

vi.mock('@keenpix/database', () => ({
  prisma: { analyticsRollupHourly: { groupBy } },
}))

const { aggregateRollupSummary, groupRollupsByBucket } = await import(
  './analytics-aggregates'
)

const window = {
  gte: new Date('2026-08-01T00:00:00.000Z'),
  lt: new Date('2026-08-02T00:00:00.000Z'),
  orgId: 'org_1',
}

describe('analytics delivery stages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('excludes legacy failed rows from cache and optimization totals', async () => {
    groupBy.mockResolvedValue([
      {
        status: 200,
        _sum: {
          requests: 9,
          cachedRequests: 6,
          optimizedRequests: 3,
        },
      },
      {
        status: 500,
        _sum: {
          requests: 1,
          cachedRequests: 0,
          optimizedRequests: 1,
        },
      },
    ])

    await expect(aggregateRollupSummary(window)).resolves.toMatchObject({
      requests: 10,
      successfulRequests: 9,
      cachedRequests: 6,
      optimizedRequests: 3,
    })
  })

  it('keeps hourly stages equal to successful deliveries', async () => {
    const bucketStart = new Date('2026-08-01T12:00:00.000Z')
    groupBy.mockResolvedValue([
      {
        bucketStart,
        status: 200,
        _sum: {
          requests: 9,
          cachedRequests: 6,
          optimizedRequests: 3,
        },
      },
      {
        bucketStart,
        status: 502,
        _sum: {
          requests: 1,
          cachedRequests: 0,
          optimizedRequests: 1,
        },
      },
    ])

    await expect(groupRollupsByBucket(window)).resolves.toMatchObject([
      {
        bucketStart,
        requests: 10,
        cachedRequests: 6,
        optimizedRequests: 3,
      },
    ])
  })
})
