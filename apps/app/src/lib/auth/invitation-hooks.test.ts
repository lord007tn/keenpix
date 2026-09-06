import { betterAuth } from 'better-auth'
import { memoryAdapter } from 'better-auth/adapters/memory'
import { organization } from 'better-auth/plugins'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getOrgPlan: vi.fn(),
  getOrgSubscription: vi.fn(),
  memberCount: vi.fn(),
  invitationCount: vi.fn(),
}))
vi.mock('@/server/deployment', () => ({ isCloud: () => true }))
vi.mock('@/data-access/subscriptions', () => ({
  getOrgPlan: mocks.getOrgPlan,
  getOrgSubscription: mocks.getOrgSubscription,
  isOrgSuspended: vi.fn(),
  orgIsServable: vi.fn(),
}))
vi.mock('@/data-access/usage', () => ({ deliveredBytesSince: vi.fn() }))
vi.mock('@keenpix/database', () => ({
  prisma: {
    member: { count: mocks.memberCount },
    invitation: { count: mocks.invitationCount },
  },
}))

import { verifyInvitationSeat } from './invitation-hooks'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.getOrgPlan.mockResolvedValue(null)
  mocks.getOrgSubscription.mockResolvedValue(null)
  mocks.memberCount.mockResolvedValue(1)
  mocks.invitationCount.mockResolvedValue(0)
})
async function invite() {
  const database = {
    user: [],
    session: [],
    account: [],
    verification: [],
    organization: [],
    member: [],
    invitation: [],
  }
  const sendInvitationEmail = vi.fn()
  const auth = betterAuth({
    baseURL: 'http://localhost:3000',
    secret: 'test-only-invitation-boundary-secret-123456789',
    database: memoryAdapter(database),
    emailAndPassword: { enabled: true },
    logger: { disabled: true },
    plugins: [
      organization({
        organizationHooks: {
          beforeCreateInvitation: ({ organization: org }) =>
            verifyInvitationSeat(org.id),
        },
        sendInvitationEmail,
      }),
    ],
  })
  const signup = await auth.api.signUpEmail({
    body: {
      name: 'Synthetic Owner',
      email: 'owner@example.test',
      password: 'Synthetic-test-password-123',
    },
    asResponse: true,
  })
  const cookie = signup.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ')
  const headers = new Headers({
    cookie,
    origin: 'http://localhost:3000',
    'content-type': 'application/json',
  })
  const org = await auth.api.createOrganization({
    headers,
    body: { name: 'Synthetic workspace', slug: 'synthetic-workspace' },
  })
  if (!org) {
    throw new Error('Synthetic organization was not created')
  }
  const response = await auth.handler(
    new Request('http://localhost:3000/api/auth/organization/invite-member', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: 'member@example.test',
        role: 'member',
        organizationId: org.id,
      }),
    }),
  )
  return { response, database, sendInvitationEmail }
}
describe('organization invitation quota HTTP boundary', () => {
  it.each([
    {
      label: 'no plan',
      subscription: null,
      message: 'An active subscription is required.',
    },
    {
      label: 'payment issue',
      subscription: { status: 'past_due' },
      message: 'Your subscription has a payment issue.',
    },
  ])('returns a structured 403 for $label without creating or emailing an invite', async ({
    subscription,
    message,
  }) => {
    mocks.getOrgSubscription.mockResolvedValue(subscription)
    const { response, database, sendInvitationEmail } = await invite()
    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({
      code: 'INVITATION_PLAN_LIMIT',
      message: expect.stringContaining(message),
    })
    expect(database.invitation).toHaveLength(0)
    expect(sendInvitationEmail).not.toHaveBeenCalled()
  })
  it('counts pending invitations in the seat limit and returns a structured 403', async () => {
    mocks.getOrgPlan.mockResolvedValue({ name: 'Basic', maxSeats: 2 })
    mocks.invitationCount.mockResolvedValue(1)
    const { response, database, sendInvitationEmail } = await invite()
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      code: 'INVITATION_PLAN_LIMIT',
      message: 'Your Basic plan includes 2 seats. Upgrade to add more.',
    })
    expect(database.invitation).toHaveLength(0)
    expect(sendInvitationEmail).not.toHaveBeenCalled()
  })
  it('keeps eligible invitations and email delivery working', async () => {
    mocks.getOrgPlan.mockResolvedValue({ name: 'Basic', maxSeats: 2 })
    const { response, database, sendInvitationEmail } = await invite()
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      email: 'member@example.test',
      status: 'pending',
    })
    expect(database.invitation).toHaveLength(1)
    expect(sendInvitationEmail).toHaveBeenCalledOnce()
  })
  it('does not disguise an unexpected database failure as a plan denial', async () => {
    const failure = new Error('database unavailable')
    mocks.getOrgPlan.mockRejectedValue(failure)
    await expect(verifyInvitationSeat('synthetic-org')).rejects.toBe(failure)
    const { response, database, sendInvitationEmail } = await invite()
    expect(response.status).toBe(500)
    expect(database.invitation).toHaveLength(0)
    expect(sendInvitationEmail).not.toHaveBeenCalled()
  })
})
