import { describe, expect, it, vi } from 'vitest'

const getEdgeCacheStats = vi.hoisted(() => vi.fn())
const listCustomerAccounts = vi.hoisted(() => vi.fn())
const getFinanceSettingsRow = vi.hoisted(() => vi.fn())
const aggregatePlatformSummary = vi.hoisted(() => vi.fn())
const getPlatformFinance = vi.hoisted(() => vi.fn())

vi.mock('@/actions/analytics', () => ({ getEdgeCacheStats }))
vi.mock('@/data-access/admin/customers', () => ({ listCustomerAccounts }))
vi.mock('@/data-access/admin/finance-settings', () => ({
  getFinanceSettingsRow,
  saveFinanceSettingsRow: vi.fn(),
}))
vi.mock('@/data-access/admin/platform-analytics', () => ({
  aggregatePlatformSummary,
  platformAnalyticsCoverageStart: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/data-access/analytics-rollups', () => ({
  historicalRollupBucketing: vi.fn().mockReturnValue({
    gte: new Date('2026-07-01T00:00:00.000Z'),
    lt: new Date('2026-07-31T00:00:00.000Z'),
  }),
}))
vi.mock('./platform-finance', () => ({ getPlatformFinance }))

const { getFinanceDashboard } = await import('./finance')

describe('finance dashboard reconciliation', () => {
  it('subtracts Polar payment costs before operating costs', async () => {
    getEdgeCacheStats.mockResolvedValue({
      edge: null,
      edgeCovered: true,
    })
    listCustomerAccounts.mockResolvedValue([])
    aggregatePlatformSummary.mockResolvedValue({
      bytesOut: 0n,
      requests: 0,
    })
    getFinanceSettingsRow.mockResolvedValue({
      serverMonthlyCents: 1000,
      databaseMonthlyCents: 0,
      observabilityMonthlyCents: 0,
      otherMonthlyCents: 0,
      originRequestsMicrodollarsPerMillion: 0,
      originBandwidthMicrodollarsPerGb: 0,
      edgeRequestsMicrodollarsPerMillion: 0,
      edgeBandwidthMicrodollarsPerGb: 0,
    })
    getPlatformFinance.mockResolvedValue({
      source: 'polar',
      revenueCents: 10_000,
      costCents: 2000,
      profitCents: 8000,
      profitMarginPct: 80,
      orders: 3,
    })

    const result = await getFinanceDashboard({ range: '30d' })

    expect(result.cost.fixedCents).toBe(986)
    expect(result.revenue.paymentCostCents).toBe(2000)
    expect(result.cost.actualTotalCents).toBe(2986)
    expect(result.profit.actualCents).toBe(7014)
    expect(result.profit.marginPct).toBeCloseTo(70.14)
  })
})
