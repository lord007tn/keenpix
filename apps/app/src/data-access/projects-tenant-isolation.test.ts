import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  apiKeyDeleteMany,
  attributionUpsert,
  drainProjectAnalyticsOutbox,
  projectDelete,
  projectLockQuery,
  transaction,
} = vi.hoisted(() => ({
  apiKeyDeleteMany: vi.fn(),
  attributionUpsert: vi.fn(),
  drainProjectAnalyticsOutbox: vi.fn(),
  projectDelete: vi.fn(),
  projectLockQuery: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('@/data-access/analytics-outbox', () => ({
  drainProjectAnalyticsOutbox,
}))

vi.mock('@keenpix/database', () => ({
  prisma: {
    $transaction: transaction,
    project: { findFirst: vi.fn() },
  },
}))

const { deleteProject } = await import('./projects')

beforeEach(() => {
  projectLockQuery.mockResolvedValue([{ id: 'project_a', orgId: 'org_a' }])
  apiKeyDeleteMany.mockResolvedValue({ count: 1 })
  attributionUpsert.mockResolvedValue({})
  drainProjectAnalyticsOutbox.mockResolvedValue([])
  projectDelete.mockResolvedValue({ id: 'project_a' })
  transaction.mockImplementation((callback) =>
    callback({
      $queryRaw: projectLockQuery,
      apiKey: { deleteMany: apiKeyDeleteMany },
      project: { delete: projectDelete },
      projectBillingAttribution: { upsert: attributionUpsert },
    }),
  )
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('project deletion tenant isolation', () => {
  it('deletes only project keys with the same organization/project scope', async () => {
    await expect(deleteProject('project_a', 'org_a')).resolves.toBe(true)
    expect(projectLockQuery).toHaveBeenCalledOnce()
    expect(drainProjectAnalyticsOutbox).toHaveBeenCalledOnce()
    expect(attributionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { orgId: 'org_a', projectId: 'project_a' },
        where: { projectId: 'project_a' },
      }),
    )
    expect(apiKeyDeleteMany).toHaveBeenCalledWith({
      where: { scope: { is: { orgId: 'org_a', projectId: 'project_a' } } },
    })
    expect(projectDelete).toHaveBeenCalledWith({ where: { id: 'project_a' } })
  })

  it('does not delete keys or projects when ownership does not match', async () => {
    projectLockQuery.mockResolvedValue([])
    await expect(deleteProject('project_b', 'org_a')).resolves.toBe(false)
    expect(apiKeyDeleteMany).not.toHaveBeenCalled()
    expect(projectDelete).not.toHaveBeenCalled()
  })
})
