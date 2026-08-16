import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  captureEdgeHistory,
  flushDurableRequestLogs,
  getUsageSettlementThrough,
  pruneLogRetention,
  reportUsage,
  sendUsageAlerts,
  shouldRunRetention,
  verifyUsageCaptureCoverage,
} = vi.hoisted(() => ({
  captureEdgeHistory: vi.fn(),
  flushDurableRequestLogs: vi.fn(),
  getUsageSettlementThrough: vi.fn(),
  pruneLogRetention: vi.fn(),
  reportUsage: vi.fn(),
  sendUsageAlerts: vi.fn(),
  shouldRunRetention: vi.fn(),
  verifyUsageCaptureCoverage: vi.fn(),
}))

vi.mock('@/env/server', () => ({ env: { CRON_SECRET: 'cron-secret' } }))
vi.mock('@/actions/analytics/edge-history', () => ({ captureEdgeHistory }))
vi.mock('@/actions/billing/verify-usage-coverage', () => ({
  verifyUsageCaptureCoverage,
}))
vi.mock('@/lib/analytics-buffer/buffer', () => ({ flushDurableRequestLogs }))
vi.mock('@/lib/billing/usage-reporter', () => ({
  getUsageSettlementThrough,
  reportUsage,
}))
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
    captureEdgeHistory.mockResolvedValue({
      configured: true,
      groups: 4,
      projectCoverage: {
        coveredFrom: new Date('2026-08-14T04:00:00Z'),
        coveredUntil: new Date('2026-08-15T04:00:00Z'),
      },
      projectGroups: 2,
    })
    flushDurableRequestLogs.mockResolvedValue(undefined)
    getUsageSettlementThrough.mockReturnValue(new Date('2026-08-15T03:00:00Z'))
    reportUsage.mockResolvedValue({ reported: 2 })
    sendUsageAlerts.mockResolvedValue({ checked: 2, sent: 0 })
    shouldRunRetention.mockReturnValue(false)
    verifyUsageCaptureCoverage.mockResolvedValue({ required: true })
  })

  it('captures edge delivery before successful metering', async () => {
    const response = await handleReportUsage(request())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      reported: 2,
      edgeHistory: { configured: true, groups: 4 },
    })
    expect(captureEdgeHistory.mock.invocationCallOrder[0]).toBeLessThan(
      verifyUsageCaptureCoverage.mock.invocationCallOrder[0],
    )
    expect(verifyUsageCaptureCoverage.mock.invocationCallOrder[0]).toBeLessThan(
      flushDurableRequestLogs.mock.invocationCallOrder[0],
    )
    expect(flushDurableRequestLogs.mock.invocationCallOrder[0]).toBeLessThan(
      reportUsage.mock.invocationCallOrder[0],
    )
    expect(flushDurableRequestLogs).toHaveBeenCalledWith({
      requireComplete: true,
      through: new Date('2026-08-15T03:00:00Z'),
    })
    expect(reportUsage).toHaveBeenCalledWith(new Date('2026-08-15T03:00:00Z'))
  })

  it('still completes edge capture when Polar metering fails', async () => {
    reportUsage.mockRejectedValue(new Error('Polar unavailable'))

    expect((await handleReportUsage(request())).status).toBe(500)
    expect(captureEdgeHistory).toHaveBeenCalledOnce()
  })

  it('returns a failing status when one or more Polar ingests fail', async () => {
    reportUsage.mockResolvedValue({
      failed: 1,
      ingested: 2,
      orgs: 3,
      skipped: false,
    })

    const response = await handleReportUsage(request())

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toMatchObject({ failed: 1 })
  })

  it('does not advance billing when edge capture fails', async () => {
    captureEdgeHistory.mockRejectedValue(new Error('Cloudflare unavailable'))

    expect((await handleReportUsage(request())).status).toBe(500)
    expect(reportUsage).not.toHaveBeenCalled()
  })

  it('does not advance billing when edge capture is not configured', async () => {
    captureEdgeHistory.mockResolvedValue({ configured: false, groups: 0 })

    expect((await handleReportUsage(request())).status).toBe(500)
    expect(reportUsage).not.toHaveBeenCalled()
  })

  it('does not advance billing when the durable analytics outbox cannot drain', async () => {
    flushDurableRequestLogs.mockRejectedValue(new Error('Postgres unavailable'))

    expect((await handleReportUsage(request())).status).toBe(500)
    expect(reportUsage).not.toHaveBeenCalled()
  })

  it('does not advance billing across an unobserved edge-capture gap', async () => {
    verifyUsageCaptureCoverage.mockRejectedValue(
      new Error('coverage gap requires reconciliation'),
    )

    expect((await handleReportUsage(request())).status).toBe(500)
    expect(flushDurableRequestLogs).not.toHaveBeenCalled()
    expect(reportUsage).not.toHaveBeenCalled()
  })

  it('rejects an invalid scheduler credential before starting work', async () => {
    expect((await handleReportUsage(request('wrong'))).status).toBe(401)
    expect(reportUsage).not.toHaveBeenCalled()
    expect(captureEdgeHistory).not.toHaveBeenCalled()
  })
})
