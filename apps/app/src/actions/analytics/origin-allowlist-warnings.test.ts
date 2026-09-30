import dayjs from 'dayjs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listBlockedOriginRequests: vi.fn(),
  getProject: vi.fn(),
  listProjects: vi.fn(),
}))
vi.mock('@/data-access/blocked-origin-requests', () => mocks)
vi.mock('@/data-access/projects', () => mocks)

import { getOriginAllowlistWarnings } from './origin-allowlist-warnings'

const project = {
  id: 'project-a',
  name: 'Storefront',
  allowedOrigins: ['assets.example.com'],
}

describe('origin allowlist warnings', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(dayjs('2026-09-30T12:00:00Z').toDate())
    mocks.listBlockedOriginRequests.mockResolvedValue([])
    mocks.getProject.mockResolvedValue(project)
    mocks.listProjects.mockResolvedValue([project])
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('uses recent traffic and the caller organization and selected project', async () => {
    mocks.listBlockedOriginRequests.mockResolvedValue([
      {
        projectId: 'project-a',
        sourceHost: 'images.example.net',
        _sum: { requests: 250 },
      },
    ])
    expect(await getOriginAllowlistWarnings('org-a', 'project-a')).toEqual([
      {
        projectId: 'project-a',
        projectName: 'Storefront',
        host: 'images.example.net',
        blockedRequests: 250,
      },
    ])
    expect(mocks.listBlockedOriginRequests).toHaveBeenCalledWith({
      orgId: 'org-a',
      projectId: 'project-a',
      since: dayjs('2026-09-29T12:00:00Z').toDate(),
    })
    expect(mocks.getProject).toHaveBeenCalledWith('project-a', 'org-a')
    expect(mocks.listProjects).not.toHaveBeenCalled()
  })

  it('omits already allowed sources, including subdomains and case differences', async () => {
    mocks.listBlockedOriginRequests.mockResolvedValue([
      {
        projectId: 'project-a',
        sourceHost: 'assets.example.com',
        _sum: { requests: 500 },
      },
      {
        projectId: 'project-a',
        sourceHost: 'IMAGES.assets.example.com',
        _sum: { requests: 250 },
      },
      {
        projectId: 'project-a',
        sourceHost: 'assets.example.com.evil.test',
        _sum: { requests: 100 },
      },
    ])
    expect(await getOriginAllowlistWarnings('org-a')).toEqual([
      expect.objectContaining({ host: 'assets.example.com.evil.test' }),
    ])
    expect(mocks.listProjects).toHaveBeenCalledWith('org-a')
  })

  it('clears a warning immediately when the current allowlist is corrected', async () => {
    mocks.listBlockedOriginRequests.mockResolvedValue([
      {
        projectId: 'project-a',
        sourceHost: 'images.example.net',
        _sum: { requests: 1000 },
      },
    ])
    expect(await getOriginAllowlistWarnings('org-a')).toHaveLength(1)
    mocks.listProjects.mockResolvedValue([
      {
        ...project,
        allowedOrigins: [...project.allowedOrigins, 'images.example.net'],
      },
    ])
    expect(await getOriginAllowlistWarnings('org-a')).toEqual([])
  })

  it('does not expose deleted or foreign project telemetry', async () => {
    mocks.listBlockedOriginRequests.mockResolvedValue([
      {
        projectId: 'foreign-project',
        sourceHost: 'private.example.net',
        _sum: { requests: 500 },
      },
    ])
    expect(await getOriginAllowlistWarnings('org-a')).toEqual([])
  })

  it('does not widen an unknown selected project to all projects', async () => {
    mocks.getProject.mockResolvedValue(undefined)
    mocks.listBlockedOriginRequests.mockResolvedValue([
      {
        projectId: 'project-a',
        sourceHost: 'images.example.net',
        _sum: { requests: 1000 },
      },
    ])
    expect(
      await getOriginAllowlistWarnings('org-a', '__invalid_project_scope__'),
    ).toEqual([])
    expect(mocks.listProjects).not.toHaveBeenCalled()
  })

  it('does not recommend malformed hosts, IP addresses, or local names', async () => {
    mocks.listBlockedOriginRequests.mockResolvedValue(
      [
        'localhost',
        '127.0.0.1',
        '-bad.example.com',
        'bad_.example.com',
        '',
      ].map((sourceHost) => ({
        projectId: 'project-a',
        sourceHost,
        _sum: { requests: 500 },
      })),
    )
    expect(await getOriginAllowlistWarnings('org-a')).toEqual([])
  })
})
