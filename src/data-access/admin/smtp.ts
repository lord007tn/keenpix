import { prisma } from '@/db'
import { env } from '@/env/server'
import { DEFAULT_SMTP_ID } from './constants'

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
