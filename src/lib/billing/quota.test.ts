import { afterEach, describe, expect, it, vi } from 'vitest'
import { PLANS } from './plans'

const NEEDS_SUB = /active subscription/i
const BASIC = /Basic/
const FREE_TRIAL = /free trial/i
const FIRST_PROJECT = /first project/i

const isCloud = vi.hoisted(() => vi.fn())
const getOrgPlan = vi.hoisted(() => vi.fn())
const getOrgSubscription = vi.hoisted(() => vi.fn())
const orgIsServable = vi.hoisted(() => vi.fn())
const isOrgSuspended = vi.hoisted(() => vi.fn())
const deliveredBytesSince = vi.hoisted(() => vi.fn())
const projectCount = vi.hoisted(() => vi.fn())
const memberCount = vi.hoisted(() => vi.fn())
const invitationCount = vi.hoisted(() => vi.fn())

vi.mock('@/server/deployment', () => ({ isCloud }))
vi.mock('@/data-access/subscriptions', () => ({
  getOrgPlan,
  getOrgSubscription,
  isOrgSuspended,
  orgIsServable,
}))
vi.mock('@/data-access/usage', () => ({ deliveredBytesSince }))
vi.mock('@/db', () => ({
  prisma: {
    project: { count: projectCount },
    member: { count: memberCount },
    invitation: { count: invitationCount },
  },
}))

const {
  assertCanAddSeat,
  assertCanCreateProject,
  assertHasProductAccess,
  assertHasWorkspaceAccess,
  getWorkspaceAccess,
  hasProductAccess,
  hasWorkspaceAccess,
  orgCanServe,
} = await import('./quota')

afterEach(() => {
  vi.clearAllMocks()
})

describe('quota — self-host is unlimited', () => {
  it('never blocks project creation or serving self-host', async () => {
    isCloud.mockReturnValue(false)
    await expect(assertCanCreateProject('org_default')).resolves.toBeUndefined()
    await expect(assertCanAddSeat('org_default')).resolves.toBeUndefined()
    expect(await orgCanServe('org_default')).toBe(true)
    expect(await hasProductAccess('org_default')).toBe(true)
    expect(await hasWorkspaceAccess('org_default')).toBe(true)
    await expect(getWorkspaceAccess('org_default')).resolves.toEqual({
      entitled: true,
      ready: true,
    })
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
    await expect(assertHasProductAccess('org_a')).rejects.toThrow(NEEDS_SUB)
    await expect(assertHasWorkspaceAccess('org_a')).rejects.toThrow(NEEDS_SUB)
    expect(await hasProductAccess('org_a')).toBe(false)
    expect(await hasWorkspaceAccess('org_a')).toBe(false)
    expect(await orgCanServe('org_a')).toBe(false)
  })

  it('grants product access to any entitled subscription source', async () => {
    isCloud.mockReturnValue(true)
    getOrgPlan.mockResolvedValue(PLANS.pro)
    await expect(assertHasProductAccess('org_a')).resolves.toEqual(PLANS.pro)
    expect(await hasProductAccess('org_a')).toBe(true)
  })

  it('requires a project before the product workspace is ready', async () => {
    isCloud.mockReturnValue(true)
    getOrgPlan.mockResolvedValue(PLANS.pro)
    projectCount.mockResolvedValue(0)
    await expect(getWorkspaceAccess('org_a')).resolves.toEqual({
      entitled: true,
      ready: false,
    })
    await expect(assertHasWorkspaceAccess('org_a')).rejects.toThrow(
      FIRST_PROJECT,
    )

    projectCount.mockResolvedValue(1)
    expect(await hasWorkspaceAccess('org_a')).toBe(true)
    await expect(assertHasWorkspaceAccess('org_a')).resolves.toEqual(PLANS.pro)
  })

  it('keeps serving during the dunning grace but blocks new resources', async () => {
    isCloud.mockReturnValue(true)
    // past_due: not an entitled plan (getOrgPlan null) but still servable.
    getOrgPlan.mockResolvedValue(null)
    orgIsServable.mockResolvedValue(true)
    getOrgSubscription.mockResolvedValue({ plan: 'basic' })
    expect(await orgCanServe('org_a')).toBe(true)
    await expect(assertCanCreateProject('org_a')).rejects.toThrow(NEEDS_SUB)
  })

  it('does not serve a suspended org even when otherwise servable', async () => {
    isCloud.mockReturnValue(true)
    isOrgSuspended.mockResolvedValue(true)
    orgIsServable.mockResolvedValue(true)
    expect(await orgCanServe('org_a')).toBe(false)
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

  it('caps a trialing org at the trial project allowance, not the plan one', async () => {
    isCloud.mockReturnValue(true)
    getOrgPlan.mockResolvedValue(PLANS.business) // maxProjects: null (unlimited)
    getOrgSubscription.mockResolvedValue({
      plan: 'business',
      status: 'trialing',
    })
    projectCount.mockResolvedValue(2) // TRIAL.maxProjects
    await expect(assertCanCreateProject('org_a')).rejects.toThrow(FREE_TRIAL)
    projectCount.mockResolvedValue(1)
    await expect(assertCanCreateProject('org_a')).resolves.toBeUndefined()
  })

  it('pauses serving once a trialing org exceeds the trial bandwidth', async () => {
    isCloud.mockReturnValue(true)
    // clearAllMocks does not reset implementations — the suspended-org test
    // above leaves isOrgSuspended resolving true unless overridden here.
    isOrgSuspended.mockResolvedValue(false)
    orgIsServable.mockResolvedValue(true)
    const GB = 1024 ** 3
    getOrgSubscription.mockResolvedValue({
      plan: 'pro',
      status: 'trialing',
      currentPeriodStart: new Date('2026-07-01T00:00:00Z'),
    })
    deliveredBytesSince.mockResolvedValue({
      bytes: 21 * GB, // over the 20 GB trial allowance
      through: new Date(),
    })
    expect(await orgCanServe('org_a')).toBe(false)
    deliveredBytesSince.mockResolvedValue({
      bytes: 5 * GB,
      through: new Date(),
    })
    expect(await orgCanServe('org_a')).toBe(true)
  })

  it('allows unlimited team members on every paid plan', async () => {
    isCloud.mockReturnValue(true)
    getOrgPlan.mockResolvedValue(PLANS.basic)
    invitationCount.mockResolvedValue(999)
    memberCount.mockResolvedValue(999)
    await expect(assertCanAddSeat('org_a')).resolves.toBeUndefined()
    expect(invitationCount).not.toHaveBeenCalled()
    expect(memberCount).not.toHaveBeenCalled()
  })
})
