import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  activityCount,
  activityFindMany,
  apiKeyFindMany,
  scopeCreate,
  scopeFindUnique,
  updateMany,
} = vi.hoisted(() => ({
  activityCount: vi.fn(),
  activityFindMany: vi.fn(),
  apiKeyFindMany: vi.fn(),
  scopeCreate: vi.fn(),
  scopeFindUnique: vi.fn(),
  updateMany: vi.fn(),
}))

vi.mock('@keenpix/database', () => ({
  prisma: {
    apiKey: { findMany: apiKeyFindMany, updateMany },
    apiKeyActivity: { count: activityCount, findMany: activityFindMany },
    apiKeyScope: { create: scopeCreate, findUnique: scopeFindUnique },
  },
}))

const {
  createApiKeyScope,
  disableOrgApiKey,
  getApiKeyScope,
  listOrgApiKeyActivities,
  listOrgApiKeys,
} = await import('./api-keys')

beforeEach(() => {
  apiKeyFindMany.mockResolvedValue([])
  activityFindMany.mockResolvedValue([])
  activityCount.mockResolvedValue(0)
  updateMany.mockResolvedValue({ count: 1 })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('API-key tenant isolation', () => {
  it('lists keys through the relational organization scope without a row cap', async () => {
    await listOrgApiKeys('org_a')
    expect(apiKeyFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          configId: 'internal',
          scope: { is: { orgId: 'org_a' } },
        },
      }),
    )
    expect(apiKeyFindMany.mock.calls[0]?.[0]).not.toHaveProperty('take')
  })

  it('narrows project settings to keys in the selected organization and project', async () => {
    await listOrgApiKeys('org_a', 'project_a')
    expect(apiKeyFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          configId: 'internal',
          scope: { is: { orgId: 'org_a', projectId: 'project_a' } },
        },
      }),
    )
  })

  it('lists activity only through keys owned by the organization', async () => {
    await listOrgApiKeyActivities('org_b')
    expect(activityFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { apiKey: { scope: { is: { orgId: 'org_b' } } } },
      }),
    )
    expect(activityCount).toHaveBeenCalledWith({
      where: { apiKey: { scope: { is: { orgId: 'org_b' } } } },
    })
  })

  it('narrows activity to keys in the selected organization and project', async () => {
    await listOrgApiKeyActivities('org_b', 0, 10, 'project_b')
    const where = {
      apiKey: {
        scope: { is: { orgId: 'org_b', projectId: 'project_b' } },
      },
    }
    expect(activityFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where }),
    )
    expect(activityCount).toHaveBeenCalledWith({ where })
  })

  it('disables a key only when its relational scope matches the active org', async () => {
    await disableOrgApiKey('key_a', 'org_a')
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'key_a',
        configId: 'internal',
        scope: { is: { orgId: 'org_a' } },
      },
      data: { enabled: false },
    })
  })

  it('fails closed when no key in the organization was disabled', async () => {
    updateMany.mockResolvedValue({ count: 0 })
    await expect(disableOrgApiKey('key_b', 'org_a')).rejects.toThrow(
      'API key not found',
    )
  })

  it('stores and reads the exact organization/project scope', async () => {
    scopeCreate.mockResolvedValue({})
    scopeFindUnique.mockResolvedValue({
      orgId: 'org_a',
      projectId: 'project_a',
    })
    await createApiKeyScope({
      apiKeyId: 'key_a',
      orgId: 'org_a',
      projectId: 'project_a',
    })
    expect(scopeCreate).toHaveBeenCalledWith({
      data: {
        apiKeyId: 'key_a',
        orgId: 'org_a',
        projectId: 'project_a',
      },
    })
    await expect(getApiKeyScope('key_a')).resolves.toEqual({
      orgId: 'org_a',
      projectId: 'project_a',
    })
  })
})
