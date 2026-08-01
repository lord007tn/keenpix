import { afterEach, describe, expect, it, vi } from 'vitest'

// Guards depend on isCloud(), the auth server, and the member-role data-access;
// mock all three so the pure authorization logic runs without a DB or session.
// (authMiddleware imports getMemberRole at module load, hence the members mock.)
async function load(cloud: boolean) {
  vi.resetModules()
  vi.doMock('@/server/deployment', () => ({ isCloud: () => cloud }))
  vi.doMock('@/lib/auth/server', () => ({ auth: {} }))
  vi.doMock('@/data-access/members', () => ({
    getMemberRole: () => Promise.resolve(null),
  }))
  return await import('./guards')
}

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('@/server/deployment')
  vi.doUnmock('@/lib/auth/server')
  vi.doUnmock('@/data-access/members')
})

describe('requireSelfHost', () => {
  it('fails closed in cloud so a tenant super-admin cannot touch platform config', async () => {
    const { requireSelfHost } = await load(true)
    expect(() => requireSelfHost()).toThrow()
  })

  it('is a no-op in self-host', async () => {
    const { requireSelfHost } = await load(false)
    expect(() => requireSelfHost()).not.toThrow()
  })
})

describe('requireActiveOrg', () => {
  it('returns the org id when present', async () => {
    const { requireActiveOrg } = await load(true)
    expect(requireActiveOrg({ orgId: 'org_x', orgRole: 'member' })).toBe(
      'org_x',
    )
  })

  it('throws when there is no active org (no read can fall back to a default tenant)', async () => {
    const { requireActiveOrg } = await load(true)
    expect(() => requireActiveOrg({ orgId: null })).toThrow()
    expect(() => requireActiveOrg({ orgId: undefined })).toThrow()
  })

  it('rejects a stale cloud organization after membership is removed', async () => {
    const { requireActiveOrg } = await load(true)
    expect(() => requireActiveOrg({ orgId: 'org_x', orgRole: null })).toThrow(
      'not a member',
    )
  })
})

describe('requireSuperAdmin', () => {
  it('rejects non-super-admins', async () => {
    const { requireSuperAdmin } = await load(false)
    expect(() => requireSuperAdmin({ role: 'user' })).toThrow()
    expect(() => requireSuperAdmin({ role: 'super_admin' })).not.toThrow()
  })
})

describe('requireOrgAdmin / requireOrgOwner', () => {
  // The org role is resolved by authMiddleware and read off context — the guards
  // themselves are pure synchronous checks.
  it('is a no-op in self-host regardless of role', async () => {
    const { requireOrgAdmin } = await load(false)
    expect(requireOrgAdmin({ orgId: 'org_x', orgRole: null })).toBe('org_x')
  })

  it('allows owner/admin in cloud', async () => {
    const { requireOrgAdmin } = await load(true)
    expect(requireOrgAdmin({ orgId: 'org_x', orgRole: 'owner' })).toBe('org_x')
    expect(requireOrgAdmin({ orgId: 'org_x', orgRole: 'admin' })).toBe('org_x')
  })

  it('rejects a plain member (or non-member) in cloud', async () => {
    const { requireOrgAdmin } = await load(true)
    expect(() =>
      requireOrgAdmin({ orgId: 'org_x', orgRole: 'member' }),
    ).toThrow()
    expect(() => requireOrgAdmin({ orgId: 'org_x', orgRole: null })).toThrow()
  })

  it('requireOrgOwner rejects an admin in cloud', async () => {
    const { requireOrgOwner } = await load(true)
    expect(() =>
      requireOrgOwner({ orgId: 'org_x', orgRole: 'admin' }),
    ).toThrow()
  })
})
