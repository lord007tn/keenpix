import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Regression guard for the M3 cross-tenant leaks: every analytics/log read must
// carry an `orgId` filter so one tenant can never see another's rollups or logs.
// We mock Prisma and assert the `where` handed to it is org-scoped — no DB, fast,
// and it fails loudly the moment a query drops org scoping.

const { findMany, groupBy } = vi.hoisted(() => ({
  findMany: vi.fn(),
  groupBy: vi.fn(),
}))

vi.mock('@/db', () => ({
  prisma: {
    requestLog: { findMany },
    analyticsRollupHourly: { groupBy },
  },
}))

const { listLogs } = await import('./logs')
const { aggregateRollupSummary, groupRollupsByProject, groupRollupsByHost } =
  await import('./analytics-aggregates')

beforeEach(() => {
  findMany.mockResolvedValue([])
  groupBy.mockResolvedValue([])
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('tenant isolation: reads are org-scoped', () => {
  it('listLogs filters by the caller org (even with a project filter)', async () => {
    await listLogs({ orgId: 'org_a', projectId: 'p1' })
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ orgId: 'org_a', projectId: 'p1' }),
      }),
    )
  })

  it('analytics summary filters by the caller org', async () => {
    await aggregateRollupSummary({ orgId: 'org_b', gte: new Date(0) })
    expect(groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ orgId: 'org_b' }),
      }),
    )
  })

  it('per-project rollup (the project-enumeration leak) filters by the caller org', async () => {
    await groupRollupsByProject({ orgId: 'org_c', gte: new Date(0) })
    expect(groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ orgId: 'org_c' }),
      }),
    )
  })

  it('per-host rollup (the customer-domain leak) filters by the caller org', async () => {
    await groupRollupsByHost({ orgId: 'org_d', gte: new Date(0) })
    expect(groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ orgId: 'org_d' }),
      }),
    )
  })
})
