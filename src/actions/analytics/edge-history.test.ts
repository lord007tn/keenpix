import { beforeEach, describe, expect, it, vi } from 'vitest'

const getEffectiveCloudflareSettings = vi.fn()
const fetchEdgeAdaptiveHourly = vi.fn()
const recordEdgeCaptureFailure = vi.fn()
const recordEdgeCaptureSuccess = vi.fn()
const upsertEdgeRollups = vi.fn()
const fetchProjectEdgeHourly = vi.fn()
const recordProjectEdgeCaptureFailure = vi.fn()
const recordProjectEdgeCaptureSuccess = vi.fn()
const upsertProjectEdgeRollups = vi.fn()

vi.mock('@/data-access/admin/cloudflare', () => ({
  getEffectiveCloudflareSettings,
}))
vi.mock('@/lib/cloudflare/analytics', () => ({ fetchEdgeAdaptiveHourly }))
vi.mock('@/data-access/edge-rollups', () => ({
  recordEdgeCaptureFailure,
  recordEdgeCaptureSuccess,
  upsertEdgeRollups,
}))
vi.mock('@/lib/cloudflare/project-edge-analytics', () => ({
  fetchProjectEdgeHourly,
}))
vi.mock('@/data-access/project-edge-rollups', () => ({
  recordProjectEdgeCaptureFailure,
  recordProjectEdgeCaptureSuccess,
  upsertProjectEdgeRollups,
}))

const { captureEdgeHistory } = await import('./edge-history')

describe('captureEdgeHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is a no-op when Cloudflare edge analytics is not configured', async () => {
    getEffectiveCloudflareSettings.mockResolvedValue(undefined)

    await expect(captureEdgeHistory()).resolves.toEqual({
      configured: false,
      groups: 0,
    })
    expect(fetchEdgeAdaptiveHourly).not.toHaveBeenCalled()
  })

  it('persists the hourly adaptive groups without exposing credentials', async () => {
    const settings = {
      apiToken: 'secret',
      host: 'keenpix.com',
      zoneId: 'zone',
    }
    const groups = [
      {
        bytes: 1200,
        cacheStatus: 'hit',
        count: 3,
        datetimeHour: '2026-07-15T00:00:00.000Z',
      },
    ]
    getEffectiveCloudflareSettings.mockResolvedValue(settings)
    fetchEdgeAdaptiveHourly.mockResolvedValue(groups)

    await expect(captureEdgeHistory()).resolves.toEqual({
      configured: true,
      groups: 1,
      projectGroups: 0,
    })
    expect(upsertEdgeRollups).toHaveBeenCalledWith(
      'zone',
      'keenpix.com',
      groups,
    )
    expect(recordEdgeCaptureSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        groups: 1,
        host: 'keenpix.com',
        zoneId: 'zone',
      }),
    )
  })

  it('records provider failures before rethrowing them', async () => {
    getEffectiveCloudflareSettings.mockResolvedValue({
      apiToken: 'secret',
      host: '',
      zoneId: 'zone',
    })
    fetchEdgeAdaptiveHourly.mockRejectedValue(new Error('token rejected'))

    await expect(captureEdgeHistory()).rejects.toThrow('token rejected')
    expect(recordEdgeCaptureFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'token rejected',
        host: '',
        zoneId: 'zone',
      }),
    )
  })

  it('captures project-attributed Analytics Engine groups independently', async () => {
    const settings = {
      accountId: 'account',
      apiToken: 'secret',
      host: 'keenpix.com',
      zoneId: 'zone',
    }
    getEffectiveCloudflareSettings.mockResolvedValue(settings)
    fetchEdgeAdaptiveHourly.mockResolvedValue([])
    fetchProjectEdgeHourly.mockResolvedValue([
      {
        bucketStart: '2026-08-04T00:00:00.000Z',
        bytes: 1200,
        cacheStatus: 'hit',
        host: 'project_1.cdn.keenpix.com',
        projectId: 'project_1',
        requests: 3,
        stage: 'edge',
        status: 200,
      },
    ])
    upsertProjectEdgeRollups.mockResolvedValue(1)

    await expect(captureEdgeHistory()).resolves.toEqual({
      configured: true,
      groups: 0,
      projectGroups: 1,
    })
    expect(recordProjectEdgeCaptureSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ groups: 1 }),
    )
  })
})
