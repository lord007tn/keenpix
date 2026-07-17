import { afterEach, describe, expect, it, vi } from 'vitest'

const removeComplimentarySubscription = vi.hoisted(() => vi.fn())
const setComplimentarySubscription = vi.hoisted(() => vi.fn())

vi.mock('@/data-access/admin/customers', () => ({
  getCustomerAccount: vi.fn(),
  listCustomerAccounts: vi.fn(),
  setOrgSuspension: vi.fn(),
}))
vi.mock('@/data-access/admin/subscriptions', () => ({
  removeComplimentarySubscription,
  setComplimentarySubscription,
}))

const { updateCustomerComplimentaryPlan } = await import('./customers')

afterEach(() => {
  vi.clearAllMocks()
})

describe('updateCustomerComplimentaryPlan', () => {
  it('revokes local access when Free is selected', async () => {
    removeComplimentarySubscription.mockResolvedValue({
      orgId: 'org_1',
      plan: null,
    })

    await updateCustomerComplimentaryPlan({
      actorId: 'admin_1',
      orgId: 'org_1',
      plan: 'free',
    })

    expect(removeComplimentarySubscription).toHaveBeenCalledWith({
      actorId: 'admin_1',
      orgId: 'org_1',
    })
    expect(setComplimentarySubscription).not.toHaveBeenCalled()
  })

  it('creates local complimentary access for a paid plan choice', async () => {
    setComplimentarySubscription.mockResolvedValue({
      orgId: 'org_1',
      plan: 'pro',
    })

    await updateCustomerComplimentaryPlan({
      actorId: 'admin_1',
      orgId: 'org_1',
      plan: 'pro',
    })

    expect(setComplimentarySubscription).toHaveBeenCalledWith({
      actorId: 'admin_1',
      orgId: 'org_1',
      plan: 'pro',
    })
    expect(removeComplimentarySubscription).not.toHaveBeenCalled()
  })
})
