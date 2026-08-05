import { describe, expect, it, vi } from 'vitest'

const groupBy = vi.hoisted(() => vi.fn())
const edgeGroupBy = vi.hoisted(() => vi.fn())

vi.mock('@keenpix/database', () => ({
  prisma: {
    analyticsRollupHourly: { groupBy },
    projectEdgeRollupHourly: { groupBy: edgeGroupBy },
  },
}))

const { groupPlatformByOrg } = await import('./platform-analytics')

describe('platform delivery stages', () => {
  it('uses successful deliveries for customer rankings and cache rates', async () => {
    edgeGroupBy.mockResolvedValue([])
    groupBy.mockResolvedValue([
      {
        orgId: 'org_1',
        status: 200,
        _sum: { requests: 9, cachedRequests: 6, bytesOut: 900n },
      },
      {
        orgId: 'org_1',
        status: 500,
        _sum: { requests: 1, cachedRequests: 1, bytesOut: 0n },
      },
    ])

    await expect(
      groupPlatformByOrg(new Date('2026-08-01T00:00:00.000Z')),
    ).resolves.toEqual([
      {
        orgId: 'org_1',
        attemptedRequests: 10,
        requests: 9,
        cachedRequests: 6,
        bytesOut: 900,
      },
    ])
  })
})
