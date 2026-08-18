import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { getMemberRole, getSession, hasWorkspaceAccess, isCloud, readLogs } =
  vi.hoisted(() => ({
    getMemberRole: vi.fn(),
    getSession: vi.fn(),
    hasWorkspaceAccess: vi.fn(),
    isCloud: vi.fn(),
    readLogs: vi.fn(),
  }))

vi.mock('@/actions/logs', () => ({ readLogs }))
vi.mock('@/data-access/members', () => ({ getMemberRole }))
vi.mock('@/lib/auth/server', () => ({ auth: { api: { getSession } } }))
vi.mock('@/lib/billing/quota', () => ({ hasWorkspaceAccess }))
vi.mock('@/server/deployment', () => ({ isCloud }))

const { handleLogStream } = await import('./stream')

beforeEach(() => {
  hasWorkspaceAccess.mockResolvedValue(true)
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('log stream organization membership', () => {
  it('rejects an organization without product access', async () => {
    isCloud.mockReturnValue(true)
    getSession.mockResolvedValue({
      session: { activeOrganizationId: 'org_unsubscribed' },
      user: { id: 'user_a' },
    })
    getMemberRole.mockResolvedValue('owner')
    hasWorkspaceAccess.mockResolvedValue(false)

    const response = await handleLogStream(
      new Request('https://keenpix.com/api/internal/logs/stream'),
    )

    expect(response.status).toBe(402)
    expect(readLogs).not.toHaveBeenCalled()
  })
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

  it('closes an existing stream when workspace access ends', async () => {
    vi.useFakeTimers()
    isCloud.mockReturnValue(true)
    getSession.mockResolvedValue({
      session: { activeOrganizationId: 'org_a' },
      user: { id: 'user_a' },
    })
    getMemberRole.mockResolvedValue('member')
    hasWorkspaceAccess.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    readLogs.mockResolvedValue([])

    const response = await handleLogStream(
      new Request('https://keenpix.com/api/internal/logs/stream'),
    )
    if (!response.body) {
      throw new Error('Expected a log stream response body')
    }
    const reader = response.body.getReader()
    await reader.read()

    await vi.advanceTimersByTimeAsync(30_000)

    let closed = false
    for (let i = 0; i < 15; i++) {
      const result = await reader.read()
      if (result.done) {
        closed = true
        break
      }
    }
    expect(closed).toBe(true)
    expect(hasWorkspaceAccess).toHaveBeenCalledTimes(2)
  })
})
