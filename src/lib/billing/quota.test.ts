import { afterEach, describe, expect, it, vi } from 'vitest'
import { PLANS } from './plans'

const NEEDS_SUB = /active subscription/i
const BASIC = /Basic/

const isCloud = vi.hoisted(() => vi.fn())
const getOrgPlan = vi.hoisted(() => vi.fn())
const orgIsServable = vi.hoisted(() => vi.fn())
const projectCount = vi.hoisted(() => vi.fn())
const memberCount = vi.hoisted(() => vi.fn())

vi.mock('@/server/deployment', () => ({ isCloud }))
vi.mock('@/data-access/subscriptions', () => ({ getOrgPlan, orgIsServable }))
vi.mock('@/db', () => ({
  prisma: {
    project: { count: projectCount },
    member: { count: memberCount },
  },
}))

const { assertCanCreateProject, assertCanAddSeat, orgCanServe } = await import(
  './quota'
)

afterEach(() => {
  vi.clearAllMocks()
})

describe('quota — self-host is unlimited', () => {
  it('never blocks project creation or serving self-host', async () => {
    isCloud.mockReturnValue(false)
    await expect(assertCanCreateProject('org_default')).resolves.toBeUndefined()
    await expect(assertCanAddSeat('org_default')).resolves.toBeUndefined()
    expect(await orgCanServe('org_default')).toBe(true)
    expect(getOrgPlan).not.toHaveBeenCalled()
  })
})

describe('quota — cloud enforcement', () => {
  it('blocks everything when the org has no active plan', async () => {
    isCloud.mockReturnValue(true)
    getOrgPlan.mockResolvedValue(null)
    orgIsServable.mockResolvedValue(false)
    await expect(assertCanCreateProject('org_a')).rejects.toThrow(NEEDS_SUB)
    await expect(assertCanAddSeat('org_a')).rejects.toThrow(NEEDS_SUB)
    expect(await orgCanServe('org_a')).toBe(false)
  })

  it('keeps serving during the dunning grace but blocks new resources', async () => {
    isCloud.mockReturnValue(true)
    // past_due: not an entitled plan (getOrgPlan null) but still servable.
    getOrgPlan.mockResolvedValue(null)
    orgIsServable.mockResolvedValue(true)
    expect(await orgCanServe('org_a')).toBe(true)
    await expect(assertCanCreateProject('org_a')).rejects.toThrow(NEEDS_SUB)
  })

  it('blocks a new project at the plan project limit', async () => {
    isCloud.mockReturnValue(true)
    getOrgPlan.mockResolvedValue(PLANS.basic) // maxProjects: 5
    projectCount.mockResolvedValue(5)
    await expect(assertCanCreateProject('org_a')).rejects.toThrow(BASIC)
    projectCount.mockResolvedValue(4)
    await expect(assertCanCreateProject('org_a')).resolves.toBeUndefined()
  })

  it('allows unlimited projects when maxProjects is null (Business)', async () => {
    isCloud.mockReturnValue(true)
    getOrgPlan.mockResolvedValue(PLANS.business) // maxProjects: null
    projectCount.mockResolvedValue(9999)
    await expect(assertCanCreateProject('org_a')).resolves.toBeUndefined()
  })

  it('blocks a new seat at the plan seat limit', async () => {
    isCloud.mockReturnValue(true)
    getOrgPlan.mockResolvedValue(PLANS.basic) // maxSeats: 3
    memberCount.mockResolvedValue(3)
    await expect(assertCanAddSeat('org_a')).rejects.toThrow(BASIC)
    memberCount.mockResolvedValue(2)
    await expect(assertCanAddSeat('org_a')).resolves.toBeUndefined()
  })
})
