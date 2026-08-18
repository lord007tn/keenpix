import { afterEach, describe, expect, it, vi } from 'vitest'

const findUnique = vi.hoisted(() => vi.fn())
vi.mock('@keenpix/database', () => ({
  prisma: {
    subscription: { findUnique },
  },
}))

const { getOrgPlan } = await import('./subscriptions')

afterEach(() => {
  vi.clearAllMocks()
})

describe('getOrgPlan', () => {
  it('resolves an active complimentary subscription', async () => {
    findUnique.mockResolvedValue({
      plan: 'business',
      status: 'active',
      polarSubscriptionId: null,
    })
    expect((await getOrgPlan('org_a'))?.name).toBe('Business')
  })

  it('resolves the plan for an active subscription', async () => {
    findUnique.mockResolvedValue({ plan: 'pro', status: 'active' })
    expect((await getOrgPlan('org_a'))?.name).toBe('Pro')
  })

  it('treats a trialing subscription as entitled', async () => {
    findUnique.mockResolvedValue({ plan: 'business', status: 'trialing' })
    expect((await getOrgPlan('org_a'))?.name).toBe('Business')
  })

  it('returns null for a non-entitled status (past_due/canceled)', async () => {
    findUnique.mockResolvedValue({ plan: 'pro', status: 'past_due' })
    expect(await getOrgPlan('org_a')).toBeNull()
  })

  it('returns null when the org has no subscription', async () => {
    findUnique.mockResolvedValue(null)
    expect(await getOrgPlan('org_a')).toBeNull()
  })
})
