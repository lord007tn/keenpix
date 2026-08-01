import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createApiKey, createApiKeyScope, getProject, isCloud, updateApiKey } =
  vi.hoisted(() => ({
    createApiKey: vi.fn(),
    createApiKeyScope: vi.fn(),
    getProject: vi.fn(),
    isCloud: vi.fn(),
    updateApiKey: vi.fn(),
  }))

vi.mock('@/actions/projects', () => ({
  getProject,
  listProjects: vi.fn(),
}))
vi.mock('@/data-access/api-keys', () => ({
  createApiKeyScope,
  disableOrgApiKey: vi.fn(),
  getApiKeyScope: vi.fn(),
  listOrgApiKeyActivities: vi.fn(),
  listOrgApiKeys: vi.fn(),
}))
vi.mock('@/lib/auth/server', () => ({
  auth: { api: { createApiKey, updateApiKey } },
}))
vi.mock('@/server/deployment', () => ({ isCloud }))

const { createOrgApiKey } = await import('./api-keys')

beforeEach(() => {
  createApiKey.mockResolvedValue({ id: 'key_a', key: 'secret' })
  createApiKeyScope.mockResolvedValue({})
  getProject.mockResolvedValue({ id: 'project_a', orgId: 'org_a' })
  updateApiKey.mockResolvedValue({})
  isCloud.mockReturnValue(false)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('createOrgApiKey', () => {
  it('requires every cloud key to belong to a project', async () => {
    isCloud.mockReturnValue(true)
    await expect(
      createOrgApiKey({
        orgId: 'org_a',
        userId: 'user_a',
        name: 'Unscoped key',
      }),
    ).rejects.toThrow('must belong to a project')
    expect(createApiKey).not.toHaveBeenCalled()
  })

  it('rejects a project that is not in the active organization', async () => {
    getProject.mockResolvedValue(undefined)
    await expect(
      createOrgApiKey({
        orgId: 'org_a',
        userId: 'user_a',
        name: 'Cross tenant',
        projectId: 'project_b',
      }),
    ).rejects.toThrow('Project not found in this organization')
    expect(createApiKey).not.toHaveBeenCalled()
    expect(createApiKeyScope).not.toHaveBeenCalled()
  })

  it('persists the exact organization and project after key creation', async () => {
    await createOrgApiKey({
      orgId: 'org_a',
      userId: 'user_a',
      name: 'Production SDK',
      projectId: 'project_a',
    })
    expect(getProject).toHaveBeenCalledWith('org_a', 'project_a')
    expect(createApiKey).toHaveBeenCalledWith({
      body: expect.objectContaining({
        userId: 'user_a',
        organizationId: 'org_a',
      }),
    })
    expect(createApiKeyScope).toHaveBeenCalledWith({
      apiKeyId: 'key_a',
      orgId: 'org_a',
      projectId: 'project_a',
    })
  })

  it('disables a newly created key if its relational scope cannot be stored', async () => {
    createApiKeyScope.mockRejectedValue(new Error('scope write failed'))
    await expect(
      createOrgApiKey({
        orgId: 'org_a',
        userId: 'user_a',
        name: 'Production SDK',
      }),
    ).rejects.toThrow('scope write failed')
    expect(updateApiKey).toHaveBeenCalledWith({
      body: { keyId: 'key_a', enabled: false, userId: 'user_a' },
    })
  })
})
