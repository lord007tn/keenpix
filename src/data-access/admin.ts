import { createHash, randomBytes } from 'node:crypto'
import { hashPassword } from 'better-auth/crypto'
import { prisma } from '@/db'
import { env } from '@/env/server'
import { getAppUrl } from '@/lib/deployment'
import {
  internalApiKeyData,
  type StaffRole,
  staffInvitationData,
  staffUserData,
} from './admin-helpers'

const DEFAULT_SMTP_ID = 'default'
const TOKEN_BYTES = 32
const DAY_MS = 86_400_000

export type { StaffRole } from './admin-helpers'

export interface SmtpSettingsInput {
  enabled?: boolean
  fromEmail?: string | null
  fromName?: string | null
  host?: string | null
  password?: string | null
  port?: number
  secure?: boolean
  username?: string | null
}

export interface PublicSmtpSettings {
  enabled: boolean
  fromEmail: string
  fromName: string
  host: string
  passwordSet: boolean
  port: number
  secure: boolean
  source: 'database' | 'environment' | 'none'
  username: string
}

export interface EffectiveSmtpSettings {
  enabled: boolean
  fromEmail: string
  fromName?: string
  host: string
  password?: string
  port: number
  secure: boolean
  username?: string
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function inviteLink(token: string) {
  return `${getAppUrl()}/invite/${token}`
}

function envSmtpSettings(): EffectiveSmtpSettings | undefined {
  if (!(env.SMTP_HOST && env.SMTP_FROM_EMAIL)) {
    return
  }
  return {
    enabled: true,
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE === 'true' || env.SMTP_SECURE === '1',
    username: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
    fromEmail: env.SMTP_FROM_EMAIL,
    fromName: env.SMTP_FROM_NAME,
  }
}

export async function listStaffUsers() {
  const rows = await prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { email: 'asc' }],
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  })
  return rows.map(staffUserData)
}

export async function listInvitations() {
  const rows = await prisma.staffInvitation.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return rows.map(staffInvitationData)
}

export async function listInternalApiKeys(configId: string) {
  const rows = await prisma.apiKey.findMany({
    where: { configId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      name: true,
      start: true,
      prefix: true,
      enabled: true,
      lastRequest: true,
      expiresAt: true,
      createdAt: true,
      metadata: true,
      permissions: true,
    },
  })

  return rows.map(internalApiKeyData)
}

export async function disableInternalApiKey(id: string, configId: string) {
  const result = await prisma.apiKey.updateMany({
    where: { id, configId },
    data: { enabled: false },
  })

  if (result.count === 0) {
    throw new Error('API key not found')
  }

  return { ok: true }
}

export async function createStaffInvitation(input: {
  email: string
  expiresDays?: number
  invitedById: string
  role: StaffRole
}) {
  const token = randomBytes(TOKEN_BYTES).toString('hex')
  const expiresDays = Math.min(30, Math.max(1, input.expiresDays ?? 7))
  const created = await prisma.staffInvitation.create({
    data: {
      email: normalizeEmail(input.email),
      role: input.role,
      tokenHash: tokenHash(token),
      invitedById: input.invitedById,
      expiresAt: new Date(Date.now() + expiresDays * DAY_MS),
    },
  })
  return { ...staffInvitationData(created), inviteLink: inviteLink(token) }
}

export async function revokeInvitation(id: string) {
  const updated = await prisma.staffInvitation.update({
    where: { id },
    data: { status: 'revoked', revokedAt: new Date() },
  })
  return staffInvitationData(updated)
}

export async function getInvitationByToken(token: string) {
  const row = await prisma.staffInvitation.findUnique({
    where: { tokenHash: tokenHash(token) },
  })
  if (!row) {
    return
  }
  return staffInvitationData(row)
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
    if (invitation.expiresAt.getTime() < Date.now()) {
      await tx.staffInvitation.update({
        where: { id: invitation.id },
        data: { status: 'expired' },
      })
      throw new Error('Invitation has expired')
    }

    const user = await tx.user.upsert({
      where: { email: invitation.email },
      update: {
        emailVerified: true,
        name: input.name?.trim() || undefined,
        role: invitation.role,
        banned: false,
        banReason: null,
        banExpires: null,
      },
      create: {
        email: invitation.email,
        emailVerified: true,
        name: input.name?.trim() || null,
        role: invitation.role,
        banned: false,
      },
    })

    const account = await tx.account.findFirst({
      where: { userId: user.id, providerId: 'credential' },
    })
    if (account) {
      await tx.account.update({
        where: { id: account.id },
        data: { accountId: user.id, password },
      })
    } else {
      await tx.account.create({
        data: {
          userId: user.id,
          accountId: user.id,
          providerId: 'credential',
          password,
        },
      })
    }

    await tx.staffInvitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted', acceptedAt: new Date() },
    })

    return staffUserData(user)
  })
}

export async function getPublicSmtpSettings(): Promise<PublicSmtpSettings> {
  const db = await prisma.smtpSettings.findUnique({
    where: { id: DEFAULT_SMTP_ID },
  })
  if (db) {
    let source: PublicSmtpSettings['source'] = 'none'
    if (db.enabled) {
      source = 'database'
    } else if (envSmtpSettings()) {
      source = 'environment'
    }
    return {
      source,
      enabled: db.enabled,
      host: db.host ?? '',
      port: db.port,
      secure: db.secure,
      username: db.username ?? '',
      passwordSet: Boolean(db.password),
      fromEmail: db.fromEmail ?? '',
      fromName: db.fromName ?? '',
    }
  }
  const envSettings = envSmtpSettings()
  return {
    source: envSettings ? 'environment' : 'none',
    enabled: Boolean(envSettings),
    host: envSettings?.host ?? '',
    port: envSettings?.port ?? 587,
    secure: envSettings?.secure ?? false,
    username: envSettings?.username ?? '',
    passwordSet: Boolean(envSettings?.password),
    fromEmail: envSettings?.fromEmail ?? '',
    fromName: envSettings?.fromName ?? '',
  }
}

export async function updateSmtpSettings(
  input: SmtpSettingsInput,
): Promise<PublicSmtpSettings> {
  const current = await prisma.smtpSettings.findUnique({
    where: { id: DEFAULT_SMTP_ID },
  })
  const data = {
    enabled: input.enabled ?? current?.enabled ?? false,
    host: input.host === undefined ? current?.host : input.host || null,
    port: input.port ?? current?.port ?? 587,
    secure: input.secure ?? current?.secure ?? false,
    username:
      input.username === undefined ? current?.username : input.username || null,
    password:
      input.password === undefined ? current?.password : input.password || null,
    fromEmail:
      input.fromEmail === undefined
        ? current?.fromEmail
        : input.fromEmail || null,
    fromName:
      input.fromName === undefined ? current?.fromName : input.fromName || null,
  }
  await prisma.smtpSettings.upsert({
    where: { id: DEFAULT_SMTP_ID },
    create: { id: DEFAULT_SMTP_ID, ...data },
    update: data,
  })
  return getPublicSmtpSettings()
}

export async function getEffectiveSmtpSettings() {
  const db = await prisma.smtpSettings.findUnique({
    where: { id: DEFAULT_SMTP_ID },
  })
  if (db?.enabled && db.host && db.fromEmail) {
    return {
      enabled: true,
      host: db.host,
      port: db.port,
      secure: db.secure,
      username: db.username ?? undefined,
      password: db.password ?? undefined,
      fromEmail: db.fromEmail,
      fromName: db.fromName ?? undefined,
    } satisfies EffectiveSmtpSettings
  }
  return envSmtpSettings()
}
