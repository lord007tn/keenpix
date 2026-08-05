import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { apiKeyDeleteMany, projectDelete, projectFindFirst, transaction } =
  vi.hoisted(() => ({
    apiKeyDeleteMany: vi.fn(),
    projectDelete: vi.fn(),
    projectFindFirst: vi.fn(),
    transaction: vi.fn(),
  }))

vi.mock('@keenpix/database', () => ({
  prisma: {
    $transaction: transaction,
    project: { findFirst: vi.fn() },
  },
}))

const { deleteProject } = await import('./projects')

beforeEach(() => {
  projectFindFirst.mockResolvedValue({ id: 'project_a' })
  apiKeyDeleteMany.mockResolvedValue({ count: 1 })
  projectDelete.mockResolvedValue({ id: 'project_a' })
  transaction.mockImplementation((callback) =>
    callback({
      apiKey: { deleteMany: apiKeyDeleteMany },
      project: { delete: projectDelete, findFirst: projectFindFirst },
    }),
  )
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('project deletion tenant isolation', () => {
  it('deletes only project keys with the same organization/project scope', async () => {
    await expect(deleteProject('project_a', 'org_a')).resolves.toBe(true)
    expect(projectFindFirst).toHaveBeenCalledWith({
      where: { id: 'project_a', orgId: 'org_a' },
      select: { id: true },
    })
    expect(apiKeyDeleteMany).toHaveBeenCalledWith({
      where: { scope: { is: { orgId: 'org_a', projectId: 'project_a' } } },
    })
    expect(projectDelete).toHaveBeenCalledWith({ where: { id: 'project_a' } })
  })

  it('does not delete keys or projects when ownership does not match', async () => {
    projectFindFirst.mockResolvedValue(null)
    await expect(deleteProject('project_b', 'org_a')).resolves.toBe(false)
    expect(apiKeyDeleteMany).not.toHaveBeenCalled()
    expect(projectDelete).not.toHaveBeenCalled()
  })
})
