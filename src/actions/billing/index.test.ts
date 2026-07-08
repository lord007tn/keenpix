import { afterEach, describe, expect, it, vi } from 'vitest'

const getOrgSubscription = vi.hoisted(() => vi.fn())
const orgHasBillingCustomer = vi.hoisted(() => vi.fn())
const billingUsageSnapshot = vi.hoisted(() => vi.fn())
vi.mock('@/data-access/subscriptions', () => ({
  getOrgSubscription,
  orgHasBillingCustomer,
}))
vi.mock('@/data-access/usage', () => ({ billingUsageSnapshot }))

const { getBillingState } = await import('./index')

const GB = 1024 ** 3

afterEach(() => {
  vi.clearAllMocks()
})

describe('getBillingState', () => {
  it('maps an active subscription onto the plan snapshot with usage + overage', async () => {
    const start = new Date('2026-07-01T00:00:00.000Z')
    const end = new Date('2026-08-01T00:00:00.000Z')
    getOrgSubscription.mockResolvedValue({
      plan: 'pro',
      status: 'active',
      currentPeriodStart: start,
      currentPeriodEnd: end,
    })
    orgHasBillingCustomer.mockResolvedValue(true)
    // 450 GB used against Pro's 400 GB allowance → 50 GB overage at 6¢/GB.
    billingUsageSnapshot.mockResolvedValue({
      bytes: 450 * GB,
      projects: 3,
      seats: 2,
    })
    const state = await getBillingState('org_a')
    expect(state.plan).toBe('pro')
    expect(state.planName).toBe('Pro')
    expect(state.status).toBe('active')
    expect(state.hasBillingCustomer).toBe(true)
    expect(state.currentPeriodEnd).toBe(end.toISOString())
    expect(state.usage.periodStart).toBe(start.toISOString())
    expect(state.usage.includedBytes).toBe(400 * GB)
    expect(state.usage.overageBytes).toBe(50 * GB)
    expect(state.usage.overageCostCents).toBe(300)
    expect(state.usage.projects).toEqual({ used: 3, limit: 25 })
    expect(state.usage.seats).toEqual({ used: 2, limit: 10 })
  })

  it('returns an unsubscribed snapshot (no allowance, no overage) when there is no row', async () => {
    getOrgSubscription.mockResolvedValue(null)
    orgHasBillingCustomer.mockResolvedValue(false)
    billingUsageSnapshot.mockResolvedValue({
      bytes: 10 * GB,
      projects: 1,
      seats: 1,
    })
    const state = await getBillingState('org_a')
    expect(state.plan).toBeNull()
    expect(state.status).toBeNull()
    expect(state.hasBillingCustomer).toBe(false)
    expect(state.usage.includedBytes).toBeNull()
    expect(state.usage.overageBytes).toBe(0)
    expect(state.usage.overageCostCents).toBe(0)
    expect(state.usage.bandwidthBytes).toBe(10 * GB)
    expect(state.usage.projects.limit).toBeNull()
  })

  it('reports the raw status even when not entitled (e.g. past_due)', async () => {
    getOrgSubscription.mockResolvedValue({
      plan: 'basic',
      status: 'past_due',
      currentPeriodStart: new Date('2026-01-01T00:00:00.000Z'),
      currentPeriodEnd: null,
    })
    orgHasBillingCustomer.mockResolvedValue(true)
    billingUsageSnapshot.mockResolvedValue({ bytes: 0, projects: 0, seats: 1 })
    const state = await getBillingState('org_a')
    expect(state.status).toBe('past_due')
    expect(state.plan).toBe('basic')
    expect(state.currentPeriodEnd).toBeNull()
    // past_due isn't entitled, so usage falls back to the calendar month rather
    // than the stale subscription period.
    expect(state.usage.periodStart).not.toBe(
      new Date('2026-01-01T00:00:00.000Z').toISOString(),
    )
  })
})
