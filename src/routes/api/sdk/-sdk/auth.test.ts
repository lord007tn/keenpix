import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { getOrgApiKeyAccess, isCloud, verifyApiKey } = vi.hoisted(() => ({
  getOrgApiKeyAccess: vi.fn(),
  isCloud: vi.fn(),
  verifyApiKey: vi.fn(),
}))

vi.mock('@/actions/api-keys', () => ({ getOrgApiKeyAccess }))
vi.mock('@/lib/auth/server', () => ({
  auth: { api: { verifyApiKey } },
}))
vi.mock('@/server/deployment', () => ({ isCloud }))

const { verifySdkApiKey } = await import('./auth')

const request = new Request('https://keenpix.com/api/sdk/projects/project_a', {
  headers: { 'x-keenpix-api-key': 'kp_internal_test' },
})

beforeEach(() => {
  isCloud.mockReturnValue(true)
  verifyApiKey.mockResolvedValue({
    valid: true,
    key: {
      id: 'key_a',
      metadata: { orgId: 'org_from_metadata', projectId: 'metadata_project' },
    },
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

async function expectStatus(promise: Promise<unknown>, status: number) {
  try {
    await promise
  } catch (error) {
    if (!(error instanceof Response)) {
      throw error
    }
    expect(error.status).toBe(status)
    return
  }
  throw new Error(`Expected request to fail with ${status}`)
}

describe('SDK API-key tenant isolation', () => {
  it('uses relational scope instead of attacker-controlled metadata', async () => {
    getOrgApiKeyAccess.mockResolvedValue({
      orgId: 'org_real',
      projectId: 'project_a',
    })
    await expect(
      verifySdkApiKey(request, 'read', 'project_a'),
    ).resolves.toEqual({
      orgId: 'org_real',
      projectId: 'project_a',
    })
  })

  it('rejects a project-scoped key against another project', async () => {
    getOrgApiKeyAccess.mockResolvedValue({
      orgId: 'org_real',
      projectId: 'project_a',
    })
    await expectStatus(
      verifySdkApiKey(request, 'read', 'project_from_another_org'),
      403,
    )
  })

  it('rejects an unscoped cloud key even when metadata claims an org', async () => {
    getOrgApiKeyAccess.mockResolvedValue(null)
    await expectStatus(verifySdkApiKey(request, 'read'), 403)
  })

  it('allows an org-wide key only inside its relational organization', async () => {
    getOrgApiKeyAccess.mockResolvedValue({ orgId: 'org_real', projectId: null })
    await expect(
      verifySdkApiKey(request, 'write', 'project_a'),
    ).resolves.toEqual({
      orgId: 'org_real',
      projectId: undefined,
    })
  })
})
