import { beforeEach, describe, expect, it, vi } from 'vitest'

const { clickhouseEnabled, listLogs, resolveProjectId, searchRequestEvents } =
  vi.hoisted(() => ({
    clickhouseEnabled: vi.fn(),
    listLogs: vi.fn(),
    resolveProjectId: vi.fn(),
    searchRequestEvents: vi.fn(),
  }))

vi.mock('@/data-access/logs', () => ({ listLogs }))
vi.mock('@/data-access/projects', () => ({ resolveProjectId }))
vi.mock('@/lib/clickhouse/config', () => ({ clickhouseEnabled }))
vi.mock('@/lib/clickhouse/events', () => ({ searchRequestEvents }))
vi.mock('@/lib/logger/logger', () => ({
  errorContext: vi.fn(),
  logger: { warn: vi.fn() },
}))

const { readLogs } = await import('./index')

beforeEach(() => {
  vi.clearAllMocks()
  resolveProjectId.mockResolvedValue(undefined)
})

describe('log project scoping', () => {
  it('fails a stale or foreign project closed in ClickHouse', async () => {
    clickhouseEnabled.mockReturnValue(true)
    searchRequestEvents.mockResolvedValue([])

    await readLogs('org_a', 'project_from_org_b')

    expect(searchRequestEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org_a',
        projectId: '__invalid_project_scope__',
      }),
    )
  })

  it('fails a stale or foreign project closed in the Postgres fallback', async () => {
    clickhouseEnabled.mockReturnValue(false)
    listLogs.mockResolvedValue([])

    await readLogs('org_a', 'missing_project')

    expect(listLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org_a',
        projectId: '__invalid_project_scope__',
      }),
    )
  })
})
