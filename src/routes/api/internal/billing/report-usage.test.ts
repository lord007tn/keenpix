import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  captureEdgeHistory,
  pruneLogRetention,
  reportUsage,
  sendUsageAlerts,
  shouldRunRetention,
} = vi.hoisted(() => ({
  captureEdgeHistory: vi.fn(),
  pruneLogRetention: vi.fn(),
  reportUsage: vi.fn(),
  sendUsageAlerts: vi.fn(),
  shouldRunRetention: vi.fn(),
}))

vi.mock('@/env/server', () => ({ env: { CRON_SECRET: 'cron-secret' } }))
vi.mock('@/actions/analytics/edge-history', () => ({ captureEdgeHistory }))
vi.mock('@/lib/billing/usage-reporter', () => ({ reportUsage }))
vi.mock('@/lib/billing/alerts', () => ({ sendUsageAlerts }))
vi.mock('@/lib/billing/log-retention', () => ({
  pruneLogRetention,
  shouldRunRetention,
}))
vi.mock('@/lib/logger/logger', () => ({
  errorContext: vi.fn(() => ({})),
  logger: { error: vi.fn() },
}))

const { handleReportUsage } = await import('./report-usage')

function request(token = 'cron-secret') {
  return new Request('https://keenpix.com/api/internal/billing/report-usage', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
  })
}

describe('usage and edge history job', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    captureEdgeHistory.mockResolvedValue({ configured: true, groups: 4 })
    reportUsage.mockResolvedValue({ reported: 2 })
    sendUsageAlerts.mockResolvedValue({ checked: 2, sent: 0 })
    shouldRunRetention.mockReturnValue(false)
  })

  it('captures edge delivery before successful metering', async () => {
    const response = await handleReportUsage(request())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      reported: 2,
      edgeHistory: { configured: true, groups: 4 },
    })
    expect(captureEdgeHistory.mock.invocationCallOrder[0]).toBeLessThan(
      reportUsage.mock.invocationCallOrder[0],
    )
  })

  it('still completes edge capture when Polar metering fails', async () => {
    reportUsage.mockRejectedValue(new Error('Polar unavailable'))

    expect((await handleReportUsage(request())).status).toBe(500)
    expect(captureEdgeHistory).toHaveBeenCalledOnce()
  })

  it('does not advance billing when edge capture fails', async () => {
    captureEdgeHistory.mockRejectedValue(new Error('Cloudflare unavailable'))

    expect((await handleReportUsage(request())).status).toBe(500)
    expect(reportUsage).not.toHaveBeenCalled()
  })

  it('rejects an invalid scheduler credential before starting work', async () => {
    expect((await handleReportUsage(request('wrong'))).status).toBe(401)
    expect(reportUsage).not.toHaveBeenCalled()
    expect(captureEdgeHistory).not.toHaveBeenCalled()
  })
})
