import { createHash, randomBytes } from 'node:crypto'
import { hashPassword } from 'better-auth/crypto'
import dayjs from 'dayjs'
import { prisma } from '@/db'
import { Prisma } from '@/generated/prisma/client'
import { getAppUrl } from '@/server/deployment'
import {
  ADMIN_ROLE,
  STAFF_ROLE,
  type StaffRole,
  TOKEN_BYTES,
} from './constants'

const EXISTING_USER_MESSAGE = 'A user with this email already exists'

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function inviteLink(token: string) {
  return `${getAppUrl()}/invite/${token}`
}

export async function listInvitations() {
  const rows = await prisma.staffInvitation.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return rows.map((invitation) => {
    const role = invitation.role === ADMIN_ROLE ? ADMIN_ROLE : STAFF_ROLE
    return {
      id: invitation.id,
      email: invitation.email,
      role,
      status: invitation.status,
      expiresAt: dayjs(invitation.expiresAt).toISOString(),
      acceptedAt: invitation.acceptedAt
        ? dayjs(invitation.acceptedAt).toISOString()
        : null,
      createdAt: dayjs(invitation.createdAt).toISOString(),
    }
  })
}

export async function createStaffInvitation(input: {
  email: string
  expiresDays?: number
  invitedById: string
  role: StaffRole
}) {
  const token = randomBytes(TOKEN_BYTES).toString('hex')
  const expiresDays = Math.min(30, Math.max(1, input.expiresDays ?? 7))
  const email = normalizeEmail(input.email)
  const created = await prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({
      where: { email },
      select: { id: true },
    })
    if (existingUser) {
      throw new Error(EXISTING_USER_MESSAGE)
    }
    return tx.staffInvitation.create({
      data: {
        email,
        role: input.role,
        tokenHash: tokenHash(token),
        invitedById: input.invitedById,
        expiresAt: dayjs().add(expiresDays, 'day').toDate(),
      },
    })
  })
  const role = created.role === ADMIN_ROLE ? ADMIN_ROLE : STAFF_ROLE
  return {
    id: created.id,
    email: created.email,
    role,
    status: created.status,
    expiresAt: dayjs(created.expiresAt).toISOString(),
    acceptedAt: created.acceptedAt
      ? dayjs(created.acceptedAt).toISOString()
      : null,
    createdAt: dayjs(created.createdAt).toISOString(),
    inviteLink: inviteLink(token),
  }
}

export async function revokeInvitation(id: string) {
  const updated = await prisma.staffInvitation.update({
    where: { id },
    data: { status: 'revoked', revokedAt: dayjs().toDate() },
  })
  const role = updated.role === ADMIN_ROLE ? ADMIN_ROLE : STAFF_ROLE
  return {
    id: updated.id,
    email: updated.email,
    role,
    status: updated.status,
    expiresAt: dayjs(updated.expiresAt).toISOString(),
    acceptedAt: updated.acceptedAt
      ? dayjs(updated.acceptedAt).toISOString()
      : null,
    createdAt: dayjs(updated.createdAt).toISOString(),
  }
}

export async function getInvitationByToken(token: string) {
  const row = await prisma.staffInvitation.findUnique({
    where: { tokenHash: tokenHash(token) },
  })
  if (!row) {
    return
  }
  const role = row.role === ADMIN_ROLE ? ADMIN_ROLE : STAFF_ROLE
  return {
    id: row.id,
    email: row.email,
    role,
    status: row.status,
    expiresAt: dayjs(row.expiresAt).toISOString(),
    acceptedAt: row.acceptedAt ? dayjs(row.acceptedAt).toISOString() : null,
    createdAt: dayjs(row.createdAt).toISOString(),
  }
}

export async function acceptInvitation(input: {
  name?: string
  password: string
  token: string
}) {
  const hashedToken = tokenHash(input.token)
  const password = await hashPassword(input.password)
  return prisma.$transaction(async (tx) => {
    const invitation = await tx.staffInvitation.findUnique({
      where: { tokenHash: hashedToken },
    })
    if (!invitation) {
      throw new Error('Invitation not found')
    }
    if (invitation.status !== 'pending' || invitation.revokedAt) {
      throw new Error('Invitation is no longer active')
    }
    if (dayjs(invitation.expiresAt).isBefore(dayjs())) {
      await tx.staffInvitation.update({
        where: { id: invitation.id },
        data: { status: 'expired' },
      })
      throw new Error('Invitation has expired')
    }

    const existingUser = await tx.user.findUnique({
      where: { email: invitation.email },
      select: { id: true },
    })
    if (existingUser) {
      throw new Error(EXISTING_USER_MESSAGE)
    }

    const user = await tx.user
      .create({
        data: {
          email: invitation.email,
          emailVerified: true,
          name: input.name?.trim() || null,
          role: invitation.role,
          banned: false,
        },
      })
      .catch((error) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new Error(EXISTING_USER_MESSAGE)
        }
        throw error
      })

    await tx.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: 'credential',
        password,
      },
    })

    await tx.staffInvitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted', acceptedAt: dayjs().toDate() },
    })

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: dayjs(user.createdAt).toISOString(),
    }
  })
}
