import { beforeEach, describe, expect, it, vi } from 'vitest'

const aggregate = vi.fn()

vi.mock('@/db', () => ({
  prisma: { analyticsRollupHourly: { aggregate } },
}))

const { analyticsCoverageStart } = await import('./analytics-aggregates')

describe('analyticsCoverageStart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    aggregate.mockResolvedValue({
      _min: { bucketStart: new Date('2026-01-01T00:00:00.000Z') },
    })
  })

  it('requires organization and project scope for historical coverage', async () => {
    await analyticsCoverageStart({ orgId: 'org_a', projectId: 'project_a' })

    expect(aggregate).toHaveBeenCalledWith({
      where: { orgId: 'org_a', projectId: 'project_a' },
      _min: { bucketStart: true },
    })
  })
})
