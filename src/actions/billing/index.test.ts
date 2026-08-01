import { afterEach, describe, expect, it, vi } from 'vitest'

const getOrgSubscription = vi.hoisted(() => vi.fn())
const getBillingCustomer = vi.hoisted(() => vi.fn())
const getSubscriptionAddon = vi.hoisted(() => vi.fn())
const orgHasBillingCustomer = vi.hoisted(() => vi.fn())
const billingUsageSnapshot = vi.hoisted(() => vi.fn())
const createCustomerSession = vi.hoisted(() => vi.fn())
const createCheckout = vi.hoisted(() => vi.fn())
const getCustomDomainAddonProductId = vi.hoisted(() => vi.fn())
vi.mock('@/data-access/subscriptions', () => ({
  getBillingCustomer,
  getOrgSubscription,
  orgHasBillingCustomer,
}))
vi.mock('@/data-access/subscription-addons', () => ({ getSubscriptionAddon }))
vi.mock('@/data-access/usage', () => ({ billingUsageSnapshot }))
vi.mock('@/lib/billing/polar-client', () => ({
  createPolarClient: () => ({
    checkouts: { create: createCheckout },
    customerSessions: { create: createCustomerSession },
  }),
}))
vi.mock('@/lib/billing/polar-checkout-products', () => ({
  getCustomDomainAddonProductId,
}))
vi.mock('@/server/deployment', () => ({
  getAppUrl: () => 'https://keenpix.com',
}))

const {
  createBillingPortalSession,
  createCustomDomainAddonCheckout,
  getBillingState,
} = await import('./index')

const GB = 1024 ** 3
const ACTIVE_BUSINESS = /active Business/i
const CONTACT_SUPPORT = /contact support/i

afterEach(() => {
  vi.clearAllMocks()
  getSubscriptionAddon.mockResolvedValue(null)
})

describe('getBillingState', () => {
  it('maps an active subscription onto the plan snapshot with usage + overage', async () => {
    const start = new Date('2026-07-01T00:00:00.000Z')
    const end = new Date('2026-08-01T00:00:00.000Z')
    getOrgSubscription.mockResolvedValue({
      polarSubscriptionId: 'sub_1',
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
      customDomains: 1,
      pendingSeats: 1,
      projects: 3,
      seats: 2,
    })
    const state = await getBillingState('org_a')
    expect(state.plan).toBe('pro')
    expect(state.planName).toBe('Pro')
    expect(state.billingSource).toBe('polar')
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
    expect(state.usage.customDomains).toEqual({ used: 1, limit: 1 })
    expect(state.usage.seats).toEqual({ used: 3, limit: 10, pending: 1 })
    expect(state.planLimits).toEqual({
      analyticsHistoryDays: 365,
      logRetentionDays: 90,
    })
  })

  it('returns an unsubscribed snapshot (no allowance, no overage) when there is no row', async () => {
    getOrgSubscription.mockResolvedValue(null)
    orgHasBillingCustomer.mockResolvedValue(false)
    billingUsageSnapshot.mockResolvedValue({
      bytes: 10 * GB,
      customDomains: 0,
      pendingSeats: 0,
      projects: 1,
      seats: 1,
    })
    const state = await getBillingState('org_a')
    expect(state.plan).toBeNull()
    expect(state.billingSource).toBe('free')
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
    getOrgSubscription.mockResolvedValue({
      polarSubscriptionId: 'sub_1',
      plan: 'basic',
      status: 'past_due',
      currentPeriodStart: new Date('2026-01-01T00:00:00.000Z'),
      currentPeriodEnd: null,
    })
    orgHasBillingCustomer.mockResolvedValue(true)
    billingUsageSnapshot.mockResolvedValue({
      bytes: 0,
      customDomains: 0,
      pendingSeats: 0,
      projects: 0,
      seats: 1,
    })
    const state = await getBillingState('org_a')
    expect(state.status).toBe('past_due')
    expect(state.plan).toBeNull()
    expect(state.billingSource).toBe('polar')
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
    getOrgSubscription.mockResolvedValue({
      polarSubscriptionId: 'sub_1',
      plan: 'pro',
      status: 'canceled',
      currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
      cancelAtPeriodEnd: true,
    })
    orgHasBillingCustomer.mockResolvedValue(true)
    billingUsageSnapshot.mockResolvedValue({
      bytes: 0,
      customDomains: 0,
      pendingSeats: 0,
      projects: 0,
      seats: 1,
    })
    const state = await getBillingState('org_a')
    expect(state.status).toBe('canceled')
    expect(state.plan).toBeNull()
    expect(state.cancelAtPeriodEnd).toBe(false)
  })

  it('uses complimentary access without overage cost or provider billing', async () => {
    getOrgSubscription.mockResolvedValue({
      polarSubscriptionId: null,
      plan: 'business',
      status: 'active',
      currentPeriodStart: null,
      currentPeriodEnd: null,
    })
    orgHasBillingCustomer.mockResolvedValue(false)
    billingUsageSnapshot.mockResolvedValue({
      bytes: 1200 * GB,
      customDomains: 4,
      pendingSeats: 0,
      projects: 8,
      seats: 3,
    })
    const state = await getBillingState('org_a')
    expect(state.plan).toBe('business')
    expect(state.billingSource).toBe('admin_grant')
    expect(state.status).toBe('active')
    expect(state.hasBillingCustomer).toBe(false)
    // Complimentary plans don't bill, so they never cancel at period end.
    expect(state.cancelAtPeriodEnd).toBe(false)
    expect(state.currentPeriodEnd).toBeNull()
    expect(state.domainAddon.canPurchase).toBe(false)
    expect(state.usage.includedBytes).toBe(1000 * GB)
    expect(state.usage.overageBytes).toBe(200 * GB)
    expect(state.usage.overageCostCents).toBe(0)
  })

  it('offers one +5 domain pack to an active Business subscription', async () => {
    getOrgSubscription.mockResolvedValue({
      polarSubscriptionId: 'sub_1',
      plan: 'business',
      status: 'active',
      currentPeriodStart: new Date('2026-07-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-08-01T00:00:00.000Z'),
    })
    orgHasBillingCustomer.mockResolvedValue(true)
    billingUsageSnapshot.mockResolvedValue({
      bytes: 0,
      customDomains: 8,
      pendingSeats: 0,
      projects: 1,
      seats: 1,
    })

    const state = await getBillingState('org_a')

    expect(state.domainAddon).toEqual({
      canPurchase: true,
      cancelAtPeriodEnd: false,
      priceMonthlyUsd: 5,
      status: null,
      units: 0,
    })
  })

  it('adds five domains only while the add-on is entitled', async () => {
    getOrgSubscription.mockResolvedValue({
      polarSubscriptionId: 'sub_1',
      plan: 'business',
      status: 'active',
      currentPeriodStart: new Date('2026-07-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-08-01T00:00:00.000Z'),
    })
    getSubscriptionAddon.mockResolvedValue({
      cancelAtPeriodEnd: true,
      status: 'active',
      units: 5,
    })
    orgHasBillingCustomer.mockResolvedValue(true)
    billingUsageSnapshot.mockResolvedValue({
      bytes: 0,
      customDomains: 11,
      pendingSeats: 0,
      projects: 1,
      seats: 1,
    })

    const state = await getBillingState('org_a')

    expect(state.domainAddon).toEqual({
      canPurchase: false,
      cancelAtPeriodEnd: true,
      priceMonthlyUsd: 5,
      status: 'active',
      units: 5,
    })
    expect(state.usage.customDomains).toEqual({ used: 11, limit: 15 })
  })
})

describe('createCustomDomainAddonCheckout', () => {
  it('creates a no-trial checkout for the existing Business customer', async () => {
    getOrgSubscription.mockResolvedValue({
      polarSubscriptionId: 'sub_1',
      plan: 'business',
      status: 'active',
    })
    getBillingCustomer.mockResolvedValue({ polarCustomerId: 'cus_org_a' })
    getSubscriptionAddon.mockResolvedValue(null)
    getCustomDomainAddonProductId.mockResolvedValue('prod_domains')
    createCheckout.mockResolvedValue({
      url: 'https://polar.sh/checkout/domain',
    })

    await expect(createCustomDomainAddonCheckout('org_a')).resolves.toEqual({
      url: 'https://polar.sh/checkout/domain',
    })
    expect(createCheckout).toHaveBeenCalledWith({
      allowTrial: false,
      customerId: 'cus_org_a',
      metadata: { addon: 'custom_domains', orgId: 'org_a', units: 5 },
      products: ['prod_domains'],
      returnUrl: 'https://keenpix.com/app/account?section=billing',
      successUrl: 'https://keenpix.com/app/account?section=billing',
    })
  })

  it('rejects add-on checkout outside an active Business subscription', async () => {
    getOrgSubscription.mockResolvedValue({
      polarSubscriptionId: 'sub_1',
      plan: 'pro',
      status: 'active',
    })
    getBillingCustomer.mockResolvedValue({ polarCustomerId: 'cus_org_a' })

    await expect(createCustomDomainAddonCheckout('org_a')).rejects.toThrow(
      ACTIVE_BUSINESS,
    )
    expect(createCheckout).not.toHaveBeenCalled()
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
