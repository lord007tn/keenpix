import { prisma } from '@keenpix/database'
import { env } from '@/env/server'
import { decryptSecret, encryptSecret } from '@/lib/secrets/crypto'
import { DEFAULT_CLOUDFLARE_ID } from './constants'

const TRAILING_DOT_RE = /\.$/

export interface CloudflareSettingsInput {
  accountId?: string | null
  apiToken?: string | null
  enabled?: boolean
  host?: string | null
  zoneId?: string | null
}

export interface PublicCloudflareSettings {
  accountId: string
  enabled: boolean
  host: string
  source: 'database' | 'environment' | 'none'
  tokenSet: boolean
  zoneId: string
}

export interface EffectiveCloudflareSettings {
  accountApiToken?: string
  accountId?: string
  apiToken: string
  enabled: boolean
  host?: string
  zoneId: string
}

function normalizeCloudflareHost(host?: string | null) {
  const normalized = host?.trim().toLowerCase().replace(TRAILING_DOT_RE, '')
  if (!normalized) {
    return
  }
  if (
    normalized.includes('://') ||
    normalized.includes('/') ||
    normalized.includes(':')
  ) {
    throw new Error('Cloudflare host must be a bare hostname.')
  }
  return normalized
}

function envCloudflareSettings(): EffectiveCloudflareSettings | undefined {
  if (!(env.CLOUDFLARE_API_TOKEN && env.CLOUDFLARE_ZONE_ID)) {
    return
  }
  return {
    enabled: true,
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    accountApiToken:
      env.CLOUDFLARE_ACCOUNT_API_TOKEN ?? env.CLOUDFLARE_API_TOKEN,
    apiToken: env.CLOUDFLARE_API_TOKEN,
    zoneId: env.CLOUDFLARE_ZONE_ID,
    host: normalizeCloudflareHost(env.CLOUDFLARE_HOST),
  }
}

export async function getPublicCloudflareSettings(): Promise<PublicCloudflareSettings> {
  const db = await prisma.cloudflareSettings.findUnique({
    where: { id: DEFAULT_CLOUDFLARE_ID },
  })
  if (db?.enabled && db.apiToken && db.zoneId) {
    return {
      source: 'database',
      enabled: true,
      accountId: db.accountId ?? env.CLOUDFLARE_ACCOUNT_ID ?? '',
      zoneId: db.zoneId ?? '',
      host: normalizeCloudflareHost(db.host) ?? '',
      tokenSet: true,
    }
  }
  const envSettings = envCloudflareSettings()
  if (envSettings) {
    return {
      source: 'environment',
      enabled: true,
      accountId: envSettings.accountId ?? '',
      zoneId: envSettings.zoneId,
      host: envSettings.host ?? '',
      tokenSet: true,
    }
  }
  return {
    source: 'none',
    accountId: db?.accountId ?? env.CLOUDFLARE_ACCOUNT_ID ?? '',
    enabled: db?.enabled ?? false,
    zoneId: db?.zoneId ?? '',
    host: db?.host ?? '',
    tokenSet: Boolean(db?.apiToken),
  }
}

export async function updateCloudflareSettings(
  input: CloudflareSettingsInput,
): Promise<PublicCloudflareSettings> {
  const current = await prisma.cloudflareSettings.findUnique({
    where: { id: DEFAULT_CLOUDFLARE_ID },
  })
  // A new non-empty token is encrypted at rest; undefined keeps the existing
  // (already-encrypted) value; an explicit empty value clears it.
  let apiToken: string | null | undefined
  if (input.apiToken === undefined) {
    apiToken = current?.apiToken
  } else {
    apiToken = input.apiToken ? encryptSecret(input.apiToken) : null
  }
  const data = {
    enabled: input.enabled ?? current?.enabled ?? false,
    apiToken,
    accountId:
      input.accountId === undefined
        ? current?.accountId
        : input.accountId || null,
    zoneId: input.zoneId === undefined ? current?.zoneId : input.zoneId || null,
    host:
      input.host === undefined
        ? current?.host
        : (normalizeCloudflareHost(input.host) ?? null),
  }
  await prisma.cloudflareSettings.upsert({
    where: { id: DEFAULT_CLOUDFLARE_ID },
    create: { id: DEFAULT_CLOUDFLARE_ID, ...data },
    update: data,
  })
  return getPublicCloudflareSettings()
}

export async function getEffectiveCloudflareSettings() {
  const db = await prisma.cloudflareSettings.findUnique({
    where: { id: DEFAULT_CLOUDFLARE_ID },
  })
  if (db?.enabled && db.apiToken && db.zoneId) {
    const apiToken = decryptSecret(db.apiToken)
    return {
      enabled: true,
      accountId: db.accountId ?? env.CLOUDFLARE_ACCOUNT_ID,
      accountApiToken: env.CLOUDFLARE_ACCOUNT_API_TOKEN ?? apiToken,
      apiToken,
      zoneId: db.zoneId,
      host: normalizeCloudflareHost(db.host),
    } satisfies EffectiveCloudflareSettings
  }
  return envCloudflareSettings()
}
