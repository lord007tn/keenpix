import { beforeEach, describe, expect, it, vi } from 'vitest'

const getEffectiveCloudflareSettings = vi.fn()
const fetchEdgeAdaptiveHourly = vi.fn()
const upsertEdgeRollups = vi.fn()

vi.mock('@/data-access/admin/cloudflare', () => ({
  getEffectiveCloudflareSettings,
}))
vi.mock('@/lib/cloudflare/analytics', () => ({ fetchEdgeAdaptiveHourly }))
vi.mock('@/data-access/edge-rollups', () => ({
  edgeCoverageStart: vi.fn(),
  listEdgeRollups: vi.fn(),
  upsertEdgeRollups,
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
    })
    expect(upsertEdgeRollups).toHaveBeenCalledWith(
      'zone',
      'keenpix.com',
      groups,
    )
  })
})
