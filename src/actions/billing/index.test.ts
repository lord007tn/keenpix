import { afterEach, describe, expect, it, vi } from 'vitest'

const getOrgSubscription = vi.hoisted(() => vi.fn())
const getBillingCustomer = vi.hoisted(() => vi.fn())
const getActiveInternalPlanGrant = vi.hoisted(() => vi.fn())
const orgHasBillingCustomer = vi.hoisted(() => vi.fn())
const billingUsageSnapshot = vi.hoisted(() => vi.fn())
const createCustomerSession = vi.hoisted(() => vi.fn())
vi.mock('@/data-access/subscriptions', () => ({
  getBillingCustomer,
  getOrgSubscription,
  orgHasBillingCustomer,
}))
vi.mock('@/data-access/internal-plan-grants', () => ({
  getActiveInternalPlanGrant,
}))
vi.mock('@/data-access/usage', () => ({ billingUsageSnapshot }))
vi.mock('@/lib/billing/polar-client', () => ({
  createPolarClient: () => ({
    customerSessions: { create: createCustomerSession },
  }),
}))
vi.mock('@/server/deployment', () => ({
  getAppUrl: () => 'https://keenpix.com',
}))

const { createBillingPortalSession, getBillingState } = await import('./index')

const GB = 1024 ** 3
const CONTACT_SUPPORT = /contact support/i

afterEach(() => {
  vi.clearAllMocks()
})

describe('getBillingState', () => {
  it('maps an active subscription onto the plan snapshot with usage + overage', async () => {
    getActiveInternalPlanGrant.mockResolvedValue(null)
    const start = new Date('2026-07-01T00:00:00.000Z')
    const end = new Date('2026-08-01T00:00:00.000Z')
    getOrgSubscription.mockResolvedValue({
      plan: 'pro',
      status: 'active',
      currentPeriodStart: start,
      currentPeriodEnd: end,
      cancelAtPeriodEnd: true,
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
    expect(state.planSource).toBe('billing')
    expect(state.status).toBe('active')
    expect(state.hasBillingCustomer).toBe(true)
    // Active but set to cancel → surfaced so the UI says "Ends", not "Renews".
    expect(state.cancelAtPeriodEnd).toBe(true)
    expect(state.currentPeriodEnd).toBe(end.toISOString())
    expect(state.usage.periodStart).toBe(start.toISOString())
    expect(state.usage.includedBytes).toBe(400 * GB)
    expect(state.usage.overageBytes).toBe(50 * GB)
    expect(state.usage.overageCostCents).toBe(300)
    expect(state.usage.projects).toEqual({ used: 3, limit: 25 })
    expect(state.usage.seats).toEqual({ used: 2, limit: 10 })
  })

  it('returns an unsubscribed snapshot (no allowance, no overage) when there is no row', async () => {
    getActiveInternalPlanGrant.mockResolvedValue(null)
    getOrgSubscription.mockResolvedValue(null)
    orgHasBillingCustomer.mockResolvedValue(false)
    billingUsageSnapshot.mockResolvedValue({
      bytes: 10 * GB,
      projects: 1,
      seats: 1,
    })
    const state = await getBillingState('org_a')
    expect(state.plan).toBeNull()
    expect(state.planSource).toBeNull()
    expect(state.status).toBeNull()
    expect(state.hasBillingCustomer).toBe(false)
    expect(state.cancelAtPeriodEnd).toBe(false)
    expect(state.usage.includedBytes).toBeNull()
    expect(state.usage.overageBytes).toBe(0)
    expect(state.usage.overageCostCents).toBe(0)
    expect(state.usage.bandwidthBytes).toBe(10 * GB)
    expect(state.usage.projects.limit).toBeNull()
  })

  it('reports the raw status even when not entitled (e.g. past_due)', async () => {
    getActiveInternalPlanGrant.mockResolvedValue(null)
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
    expect(state.plan).toBeNull()
    expect(state.planSource).toBeNull()
    expect(state.currentPeriodEnd).toBeNull()
    // past_due isn't entitled, so usage falls back to the calendar month rather
    // than the stale subscription period.
    expect(state.usage.periodStart).not.toBe(
      new Date('2026-01-01T00:00:00.000Z').toISOString(),
    )
  })

  it('does not report cancelAtPeriodEnd for a terminal subscription', async () => {
    // Polar keeps cancel_at_period_end=true on the revoked/canceled payload after
    // the period ends. Gating on entitlement stops the UI from showing a stale
    // "you'll keep access until {past date}" notice for a churned org.
    getActiveInternalPlanGrant.mockResolvedValue(null)
    getOrgSubscription.mockResolvedValue({
      plan: 'pro',
      status: 'canceled',
      currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
      cancelAtPeriodEnd: true,
    })
    orgHasBillingCustomer.mockResolvedValue(true)
    billingUsageSnapshot.mockResolvedValue({ bytes: 0, projects: 0, seats: 1 })
    const state = await getBillingState('org_a')
    expect(state.status).toBe('canceled')
    expect(state.plan).toBeNull()
    expect(state.cancelAtPeriodEnd).toBe(false)
  })

  it('uses an internal grant as the effective plan without overage cost', async () => {
    getActiveInternalPlanGrant.mockResolvedValue({ plan: 'business' })
    getOrgSubscription.mockResolvedValue(null)
    orgHasBillingCustomer.mockResolvedValue(false)
    billingUsageSnapshot.mockResolvedValue({
      bytes: 1200 * GB,
      projects: 8,
      seats: 3,
    })
    const state = await getBillingState('org_a')
    expect(state.plan).toBe('business')
    expect(state.planSource).toBe('internal')
    expect(state.status).toBe('internal')
    expect(state.hasBillingCustomer).toBe(false)
    // Internal grants don't bill, so they never "cancel at period end".
    expect(state.cancelAtPeriodEnd).toBe(false)
    expect(state.usage.includedBytes).toBe(1000 * GB)
    expect(state.usage.overageBytes).toBe(200 * GB)
    expect(state.usage.overageCostCents).toBe(0)
  })

  it('keeps a higher paid plan effective when an internal grant is lower', async () => {
    const start = new Date('2026-07-01T00:00:00.000Z')
    getActiveInternalPlanGrant.mockResolvedValue({ plan: 'basic' })
    getOrgSubscription.mockResolvedValue({
      plan: 'pro',
      status: 'active',
      currentPeriodStart: start,
      currentPeriodEnd: null,
    })
    orgHasBillingCustomer.mockResolvedValue(true)
    billingUsageSnapshot.mockResolvedValue({
      bytes: 0,
      projects: 1,
      seats: 1,
    })
    const state = await getBillingState('org_a')
    expect(state.plan).toBe('pro')
    expect(state.planSource).toBe('billing')
    expect(state.status).toBe('active')
  })
})

describe('createBillingPortalSession', () => {
  it('creates an organization portal session from the mirrored customer id', async () => {
    getBillingCustomer.mockResolvedValue({ polarCustomerId: 'cus_org_a' })
    createCustomerSession.mockResolvedValue({
      customerPortalUrl: 'https://polar.sh/portal/session',
    })

    await expect(createBillingPortalSession('org_a')).resolves.toEqual({
      url: 'https://polar.sh/portal/session',
    })
    expect(createCustomerSession).toHaveBeenCalledWith({
      customerId: 'cus_org_a',
      returnUrl: 'https://keenpix.com/app/account?section=billing',
    })
  })

  it('gives a recovery path when the workspace has no customer link', async () => {
    getBillingCustomer.mockResolvedValue(null)

    await expect(createBillingPortalSession('org_a')).rejects.toThrow(
      CONTACT_SUPPORT,
    )
    expect(createCustomerSession).not.toHaveBeenCalled()
  })
})
