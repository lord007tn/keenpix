import { createHash, randomBytes } from 'node:crypto'
import { hashPassword } from 'better-auth/crypto'
import { prisma } from '@/db'
import { env } from '@/env/server'
import { getAppUrl } from '@/lib/deployment'

const DEFAULT_SMTP_ID = 'default'
const TOKEN_BYTES = 32
const DAY_MS = 86_400_000

export type StaffRole = 'admin' | 'staff'

export interface StaffUser {
  createdAt: string
  email: string
  id: string
  name: string | null
  role: string
}

export interface StaffInvitationRow {
  acceptedAt: string | null
  createdAt: string
  email: string
  expiresAt: string
  id: string
  role: StaffRole
  status: string
}

export interface CreatedInvitation extends StaffInvitationRow {
  inviteLink: string
}

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

export interface InternalApiKeyRow {
  createdAt: Date
  enabled: boolean
  expiresAt: Date | null
  id: string
  lastRequest: Date | null
  metadata: {
    projectId?: string
  } | null
  name: string | null
  permissions: Record<string, string[]> | null
  prefix: string | null
  start: string | null
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

function iso(d: Date | null | undefined) {
  return d ? d.toISOString() : null
}

function parseObject(value: string | null) {
  if (!value) {
    return null
  }

  try {
    const parsed = JSON.parse(value)
    if (typeof parsed === 'string') {
      return parseObject(parsed)
    }
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

function parsePermissions(value: string | null) {
  const parsed = parseObject(value)
  if (!parsed) {
    return null
  }

  const permissions: Record<string, string[]> = {}
  for (const [resource, actions] of Object.entries(parsed)) {
    if (Array.isArray(actions)) {
      permissions[resource] = actions.filter(
        (action): action is string => typeof action === 'string',
      )
    }
  }

  return permissions
}

function parseApiKeyMetadata(value: string | null) {
  const parsed = parseObject(value)
  const projectId = parsed?.projectId
  return typeof projectId === 'string' && projectId.trim()
    ? { projectId: projectId.trim() }
    : null
}

function toInternalApiKeyRow(apiKey: {
  createdAt: Date
  enabled: boolean
  expiresAt: Date | null
  id: string
  lastRequest: Date | null
  metadata: string | null
  name: string | null
  permissions: string | null
  prefix: string | null
  start: string | null
}): InternalApiKeyRow {
  return {
    id: apiKey.id,
    name: apiKey.name,
    start: apiKey.start,
    prefix: apiKey.prefix,
    enabled: apiKey.enabled,
    lastRequest: apiKey.lastRequest,
    expiresAt: apiKey.expiresAt,
    createdAt: apiKey.createdAt,
    metadata: parseApiKeyMetadata(apiKey.metadata),
    permissions: parsePermissions(apiKey.permissions),
  }
}

function toStaffUser(user: {
  createdAt: Date
  email: string
  id: string
  name: string | null
  role: string
}): StaffUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  }
}

function toInvitation(invitation: {
  acceptedAt: Date | null
  createdAt: Date
  email: string
  expiresAt: Date
  id: string
  role: string
  status: string
}): StaffInvitationRow {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role === 'admin' ? 'admin' : 'staff',
    status: invitation.status,
    expiresAt: invitation.expiresAt.toISOString(),
    acceptedAt: iso(invitation.acceptedAt),
    createdAt: invitation.createdAt.toISOString(),
  }
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

export async function listStaffUsers(): Promise<StaffUser[]> {
  const rows = await prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { email: 'asc' }],
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  })
  return rows.map(toStaffUser)
}

export async function listInvitations(): Promise<StaffInvitationRow[]> {
  const rows = await prisma.staffInvitation.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return rows.map(toInvitation)
}

export async function listInternalApiKeys(
  configId: string,
): Promise<InternalApiKeyRow[]> {
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

  return rows.map(toInternalApiKeyRow)
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
}): Promise<CreatedInvitation> {
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
  return { ...toInvitation(created), inviteLink: inviteLink(token) }
}

export async function revokeInvitation(id: string) {
  const updated = await prisma.staffInvitation.update({
    where: { id },
    data: { status: 'revoked', revokedAt: new Date() },
  })
  return toInvitation(updated)
}

export async function getInvitationByToken(token: string) {
  const row = await prisma.staffInvitation.findUnique({
    where: { tokenHash: tokenHash(token) },
  })
  if (!row) {
    return
  }
  return toInvitation(row)
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

    return toStaffUser(user)
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
