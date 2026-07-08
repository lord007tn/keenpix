import { afterEach, describe, expect, it, vi } from 'vitest'

const findUnique = vi.hoisted(() => vi.fn())
const internalGrantFindFirst = vi.hoisted(() => vi.fn())
vi.mock('@/db', () => ({
  prisma: {
    internalPlanGrant: { findFirst: internalGrantFindFirst },
    subscription: { findUnique },
  },
}))

const { getOrgPlan } = await import('./subscriptions')

afterEach(() => {
  vi.clearAllMocks()
})

describe('getOrgPlan', () => {
  it('uses an internal grant when it is above the billing subscription', async () => {
    internalGrantFindFirst.mockResolvedValue({ plan: 'business' })
    findUnique.mockResolvedValue({ plan: 'basic', status: 'active' })
    expect((await getOrgPlan('org_a'))?.name).toBe('Business')
  })

  it('does not let a lower internal grant downgrade an active paid plan', async () => {
    internalGrantFindFirst.mockResolvedValue({ plan: 'basic' })
    findUnique.mockResolvedValue({ plan: 'pro', status: 'active' })
    expect((await getOrgPlan('org_a'))?.name).toBe('Pro')
  })

  it('resolves the plan for an active subscription', async () => {
    internalGrantFindFirst.mockResolvedValue(null)
    findUnique.mockResolvedValue({ plan: 'pro', status: 'active' })
    expect((await getOrgPlan('org_a'))?.name).toBe('Pro')
  })

  it('treats a trialing subscription as entitled', async () => {
    internalGrantFindFirst.mockResolvedValue(null)
    findUnique.mockResolvedValue({ plan: 'business', status: 'trialing' })
    expect((await getOrgPlan('org_a'))?.name).toBe('Business')
  })

  it('returns null for a non-entitled status (past_due/canceled)', async () => {
    internalGrantFindFirst.mockResolvedValue(null)
    findUnique.mockResolvedValue({ plan: 'pro', status: 'past_due' })
    expect(await getOrgPlan('org_a')).toBeNull()
  })

  it('returns null when the org has no subscription', async () => {
    internalGrantFindFirst.mockResolvedValue(null)
    findUnique.mockResolvedValue(null)
    expect(await getOrgPlan('org_a')).toBeNull()
  })
})
