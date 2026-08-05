import { afterEach, describe, expect, it, vi } from 'vitest'

async function load(cloud: boolean) {
  vi.resetModules()
  vi.doMock('@/server/deployment', () => ({ isCloud: () => cloud }))
  return await import('./active-org')
}

afterEach(() => {
  vi.doUnmock('@/server/deployment')
  vi.resetModules()
})

describe('resolveActiveOrgId', () => {
  it('self-host always resolves to the single org_default, ignoring the session', async () => {
    const { resolveActiveOrgId, DEFAULT_ORG_ID } = await load(false)
    expect(resolveActiveOrgId(null)).toBe(DEFAULT_ORG_ID)
    expect(resolveActiveOrgId(undefined)).toBe(DEFAULT_ORG_ID)
    // Even a foreign active org cannot widen scope in self-host.
    expect(resolveActiveOrgId('some-other-org')).toBe(DEFAULT_ORG_ID)
  })

  it('cloud uses the session active org, or null before one is selected', async () => {
    const { resolveActiveOrgId } = await load(true)
    expect(resolveActiveOrgId('org_abc')).toBe('org_abc')
    expect(resolveActiveOrgId(null)).toBeNull()
    expect(resolveActiveOrgId(undefined)).toBeNull()
  })
})
