import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const aggregateRollupSummary = vi.hoisted(() => vi.fn())
const groupRollupsByBucket = vi.hoisted(() => vi.fn())
const getOrgPlan = vi.hoisted(() => vi.fn())

vi.mock('@/data-access/analytics-aggregates', () => ({
  aggregateRollupSummary,
  groupRollupsByBucket,
}))

vi.mock('@/data-access/subscriptions', () => ({ getOrgPlan }))

vi.mock('@/helpers/analytics/rollup-shapers', () => ({
  summarizeAgg: vi.fn(() => ({ totalRequests: 0 })),
  timeSeriesFromBuckets: vi.fn(() => []),
}))

const { getCustomerUsageSeries } = await import('./customer-analytics')

describe('getCustomerUsageSeries', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-15T12:00:00.000Z'))
    aggregateRollupSummary.mockResolvedValue({})
    groupRollupsByBucket.mockResolvedValue([])
    getOrgPlan.mockResolvedValue({ historyDays: 365 })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('uses 90 inclusive calendar days instead of an 84-day weekly window', async () => {
    const result = await getCustomerUsageSeries('org_1', { range: '90d' })

    expect(aggregateRollupSummary).toHaveBeenCalledWith({
      gte: new Date('2026-04-17T00:00:00.000Z'),
      lt: new Date('2026-07-15T12:00:00.000Z'),
      orgId: 'org_1',
    })
    expect(result.window.from).toBe('2026-04-17')
  })

  it('queries a custom date range inclusively', async () => {
    const result = await getCustomerUsageSeries('org_1', {
      from: '2026-07-01',
      range: 'custom',
      to: '2026-07-10',
    })

    expect(groupRollupsByBucket).toHaveBeenCalledWith({
      gte: new Date('2026-07-01T00:00:00.000Z'),
      lt: new Date('2026-07-11T00:00:00.000Z'),
      orgId: 'org_1',
    })
    expect(result.window.to).toBe('2026-07-10')
  })

  it('bounds non-entitled customer history to the default retention', async () => {
    getOrgPlan.mockResolvedValue(null)

    const result = await getCustomerUsageSeries('org_1', { range: '365d' })

    expect(result.range).toBe('90d')
    expect(result.maxHistoryDays).toBe(90)
  })
})
