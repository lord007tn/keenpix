import { afterEach, describe, expect, it, vi } from 'vitest'

const removeComplimentarySubscription = vi.hoisted(() => vi.fn())
const setComplimentarySubscription = vi.hoisted(() => vi.fn())
const listCustomerAccounts = vi.hoisted(() => vi.fn())
const addCustomerFinance = vi.hoisted(() => vi.fn())

vi.mock('@/data-access/admin/customers', () => ({
  listCustomerAccounts,
  setOrgSuspension: vi.fn(),
}))
vi.mock('@/data-access/admin/subscriptions', () => ({
  removeComplimentarySubscription,
  setComplimentarySubscription,
}))
vi.mock('./finance', () => ({ addCustomerFinance }))

const { getCustomerAccountById, updateCustomerComplimentaryPlan } =
  await import('./customers')

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

describe('getCustomerAccountById', () => {
  it('preserves the platform-wide fixed-cost allocation on customer detail', async () => {
    const accounts = [{ id: 'org_1' }, { id: 'org_2' }]
    const financed = [
      { id: 'org_1', finance30d: { allocatedFixedCostCents: 300 } },
      { id: 'org_2', finance30d: { allocatedFixedCostCents: 700 } },
    ]
    listCustomerAccounts.mockResolvedValue(accounts)
    addCustomerFinance.mockResolvedValue(financed)

    await expect(getCustomerAccountById('org_2')).resolves.toBe(financed[1])
    expect(addCustomerFinance).toHaveBeenCalledWith(accounts)
  })
})
