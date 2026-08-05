import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  ensurePersonalOrganizationMembership,
  getLatestMembership,
  getMemberRole,
  getSession,
  isCloud,
  setSessionActiveOrganization,
} = vi.hoisted(() => ({
  ensurePersonalOrganizationMembership: vi.fn(),
  getLatestMembership: vi.fn(),
  getMemberRole: vi.fn(),
  getSession: vi.fn(),
  isCloud: vi.fn(),
  setSessionActiveOrganization: vi.fn(),
}))

vi.mock('@tanstack/react-start/server', () => ({
  getRequestHeaders: () => new Headers(),
}))
vi.mock('@/data-access/members', () => ({
  ensurePersonalOrganizationMembership,
  getLatestMembership,
  getMemberRole,
  setSessionActiveOrganization,
}))
vi.mock('@/lib/auth/server', () => ({ auth: { api: { getSession } } }))
vi.mock('@/server/deployment', () => ({ isCloud }))

const { authMiddleware } = await import('./guards')
const runAuthMiddleware = Reflect.get(authMiddleware.options, 'server')
if (!runAuthMiddleware) {
  throw new Error('auth middleware server handler is unavailable')
}

beforeEach(() => {
  vi.clearAllMocks()
  getLatestMembership.mockResolvedValue(null)
  ensurePersonalOrganizationMembership.mockResolvedValue(null)
})

describe('auth middleware organization membership', () => {
  it('fails closed when a cloud session points at an organization that removed the user', async () => {
    isCloud.mockReturnValue(true)
    getSession.mockResolvedValue({
      session: { activeOrganizationId: 'org_removed' },
      user: { id: 'user_a', email: 'member@example.com' },
    })
    getMemberRole.mockResolvedValue(null)
    const next = vi.fn()

    await expect(runAuthMiddleware({ next } as never)).rejects.toThrow(
      'not a member',
    )
    expect(getMemberRole).toHaveBeenCalledWith('user_a', 'org_removed')
    expect(next).not.toHaveBeenCalled()
  })

  it('passes the verified organization and role to downstream functions', async () => {
    isCloud.mockReturnValue(true)
    getSession.mockResolvedValue({
      session: { activeOrganizationId: 'org_a' },
      user: {
        id: 'user_a',
        email: 'member@example.com',
        name: 'Member',
        role: 'user',
      },
    })
    getMemberRole.mockResolvedValue('member')
    const next = vi.fn().mockResolvedValue('ok')

    await expect(runAuthMiddleware({ next } as never)).resolves.toBe('ok')
    expect(next).toHaveBeenCalledWith({
      context: {
        userId: 'user_a',
        email: 'member@example.com',
        impersonatedBy: null,
        name: 'Member',
        role: 'user',
        orgId: 'org_a',
        orgRole: 'member',
      },
    })
  })

  it('passes the trusted impersonating operator id to downstream functions', async () => {
    isCloud.mockReturnValue(true)
    getSession.mockResolvedValue({
      session: {
        activeOrganizationId: 'org_a',
        impersonatedBy: 'operator_a',
      },
      user: {
        id: 'user_a',
        email: 'member@example.com',
        name: 'Member',
        role: 'user',
      },
    })
    getMemberRole.mockResolvedValue('member')
    const next = vi.fn().mockResolvedValue('ok')

    await expect(runAuthMiddleware({ next } as never)).resolves.toBe('ok')
    expect(next).toHaveBeenCalledWith({
      context: expect.objectContaining({ impersonatedBy: 'operator_a' }),
    })
  })

  it('repairs a stale active organization from another valid membership', async () => {
    isCloud.mockReturnValue(true)
    getSession.mockResolvedValue({
      session: { id: 'session_a', activeOrganizationId: 'org_removed' },
      user: {
        id: 'user_a',
        email: 'member@example.com',
        emailVerified: true,
        name: 'Member',
        role: 'user',
      },
    })
    getMemberRole.mockResolvedValue(null)
    getLatestMembership.mockResolvedValue({
      organizationId: 'org_valid',
      role: 'admin',
    })
    const next = vi.fn().mockResolvedValue('ok')

    await expect(runAuthMiddleware({ next } as never)).resolves.toBe('ok')
    expect(setSessionActiveOrganization).toHaveBeenCalledWith(
      'session_a',
      'org_valid',
    )
    expect(next).toHaveBeenCalledWith({
      context: expect.objectContaining({
        orgId: 'org_valid',
        orgRole: 'admin',
      }),
    })
  })
})
