import { afterEach, describe, expect, it, vi } from 'vitest'

const { getMemberRole, getSession, isCloud, readLogs } = vi.hoisted(() => ({
  getMemberRole: vi.fn(),
  getSession: vi.fn(),
  isCloud: vi.fn(),
  readLogs: vi.fn(),
}))

vi.mock('@/actions/logs', () => ({ readLogs }))
vi.mock('@/data-access/members', () => ({ getMemberRole }))
vi.mock('@/lib/auth/server', () => ({ auth: { api: { getSession } } }))
vi.mock('@/server/deployment', () => ({ isCloud }))

const { handleLogStream } = await import('./stream')

afterEach(() => {
  vi.clearAllMocks()
})

describe('log stream organization membership', () => {
  it('rejects a removed cloud member before reading any logs', async () => {
    isCloud.mockReturnValue(true)
    getSession.mockResolvedValue({
      session: { activeOrganizationId: 'org_removed' },
      user: { id: 'user_a' },
    })
    getMemberRole.mockResolvedValue(null)

    const response = await handleLogStream(
      new Request('https://keenpix.com/api/internal/logs/stream'),
    )

    expect(response.status).toBe(403)
    expect(getMemberRole).toHaveBeenCalledWith('user_a', 'org_removed')
    expect(readLogs).not.toHaveBeenCalled()
  })

  it('closes an existing stream before the next read when membership is revoked', async () => {
    isCloud.mockReturnValue(true)
    getSession.mockResolvedValue({
      session: { activeOrganizationId: 'org_a' },
      user: { id: 'user_a' },
    })
    getMemberRole.mockResolvedValueOnce('member').mockResolvedValueOnce(null)

    const response = await handleLogStream(
      new Request('https://keenpix.com/api/internal/logs/stream'),
    )
    if (!response.body) {
      throw new Error('Expected a log stream response body')
    }

    await expect(response.body.getReader().read()).resolves.toEqual({
      done: true,
      value: undefined,
    })
    expect(getMemberRole).toHaveBeenCalledTimes(2)
    expect(readLogs).not.toHaveBeenCalled()
  })
})
