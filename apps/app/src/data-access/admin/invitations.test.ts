import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const hashPassword = vi.hoisted(() => vi.fn())
const userFindUnique = vi.hoisted(() => vi.fn())
const userCreate = vi.hoisted(() => vi.fn())
const userUpsert = vi.hoisted(() => vi.fn())
const accountCreate = vi.hoisted(() => vi.fn())
const accountUpdate = vi.hoisted(() => vi.fn())
const invitationCreate = vi.hoisted(() => vi.fn())
const invitationFindUnique = vi.hoisted(() => vi.fn())
const invitationUpdate = vi.hoisted(() => vi.fn())
const KnownRequestError = vi.hoisted(
  () =>
    class extends Error {
      code: string

      constructor(code: string) {
        super(code)
        this.code = code
      }
    },
)

vi.mock('better-auth/crypto', () => ({ hashPassword }))
vi.mock('@keenpix/database/client', () => ({
  Prisma: { PrismaClientKnownRequestError: KnownRequestError },
}))
vi.mock('@/server/deployment', () => ({
  getAppUrl: () => 'https://keenpix.test',
}))
vi.mock('@keenpix/database', () => {
  const tx = {
    user: {
      findUnique: userFindUnique,
      create: userCreate,
      upsert: userUpsert,
    },
    account: { create: accountCreate, update: accountUpdate },
    staffInvitation: {
      create: invitationCreate,
      findUnique: invitationFindUnique,
      update: invitationUpdate,
    },
  }
  return {
    prisma: {
      ...tx,
      $transaction: (operation: (client: typeof tx) => unknown) =>
        operation(tx),
    },
  }
})

const { acceptInvitation, createStaffInvitation } = await import(
  './invitations'
)

const invitation = {
  id: 'invite_1',
  email: 'invitee@example.com',
  role: 'staff',
  tokenHash: 'token-hash',
  status: 'pending',
  invitedById: 'admin_1',
  expiresAt: new Date('2099-01-01T00:00:00.000Z'),
  acceptedAt: null,
  revokedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

beforeEach(() => {
  hashPassword.mockResolvedValue('hashed-new-password')
  invitationFindUnique.mockResolvedValue(invitation)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('createStaffInvitation', () => {
  it.each([
    'user',
    'superadmin',
  ])('rejects an email already owned by a %s account', async (role) => {
    userFindUnique.mockResolvedValue({ id: `${role}_1` })

    await expect(
      createStaffInvitation({
        email: ' Invitee@Example.com ',
        invitedById: 'admin_1',
        role: 'staff',
      }),
    ).rejects.toThrow('A user with this email already exists')

    expect(userFindUnique).toHaveBeenCalledWith({
      where: { email: 'invitee@example.com' },
      select: { id: true },
    })
    expect(invitationCreate).not.toHaveBeenCalled()
  })
})

describe('acceptInvitation', () => {
  it.each([
    'user',
    'superadmin',
  ])('does not alter an existing %s account or its credentials', async (role) => {
    userFindUnique.mockResolvedValue({ id: `${role}_1` })

    await expect(
      acceptInvitation({
        name: 'Replacement Name',
        password: 'replacement-password',
        token: 'invite-token',
      }),
    ).rejects.toThrow('A user with this email already exists')

    expect(userCreate).not.toHaveBeenCalled()
    expect(userUpsert).not.toHaveBeenCalled()
    expect(accountCreate).not.toHaveBeenCalled()
    expect(accountUpdate).not.toHaveBeenCalled()
    expect(invitationUpdate).not.toHaveBeenCalled()
  })

  it('rejects a user-created race without changing credentials or accepting the invite', async () => {
    userFindUnique.mockResolvedValue(null)
    userCreate.mockRejectedValue(new KnownRequestError('P2002'))

    await expect(
      acceptInvitation({
        password: 'replacement-password',
        token: 'invite-token',
      }),
    ).rejects.toThrow('A user with this email already exists')

    expect(accountCreate).not.toHaveBeenCalled()
    expect(accountUpdate).not.toHaveBeenCalled()
    expect(invitationUpdate).not.toHaveBeenCalled()
  })

  it('creates a new user and credential account for an unclaimed email', async () => {
    const createdAt = new Date('2026-01-02T00:00:00.000Z')
    userFindUnique.mockResolvedValue(null)
    userCreate.mockResolvedValue({
      id: 'user_1',
      email: invitation.email,
      name: 'Invitee',
      role: 'staff',
      createdAt,
    })

    await expect(
      acceptInvitation({
        name: ' Invitee ',
        password: 'new-password',
        token: 'invite-token',
      }),
    ).resolves.toEqual({
      id: 'user_1',
      email: invitation.email,
      name: 'Invitee',
      role: 'staff',
      createdAt: createdAt.toISOString(),
    })

    expect(userCreate).toHaveBeenCalledWith({
      data: {
        email: invitation.email,
        emailVerified: true,
        name: 'Invitee',
        role: 'staff',
        banned: false,
      },
    })
    expect(accountCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user_1',
        accountId: 'user_1',
        providerId: 'credential',
        password: 'hashed-new-password',
      },
    })
    expect(invitationUpdate).toHaveBeenCalledWith({
      where: { id: invitation.id },
      data: { status: 'accepted', acceptedAt: expect.any(Date) },
    })
  })
})
