import dayjs from 'dayjs'
import type { z } from 'zod'
import {
  acceptInvitation as acceptInvitationInDb,
  countApiKeyActivities,
  createApiKeyActivity as createApiKeyActivityInDb,
  createStaffInvitation,
  disableInternalApiKey,
  getEffectiveSmtpSettings,
  getInvitationByToken,
  getPublicSmtpSettings,
  listApiKeyActivities,
  listInternalApiKeys,
  listInvitations,
  listStaffUsers,
  type NewApiKeyActivity,
  revokeInvitation as revokeInvitationInDb,
  type SmtpSettingsInput,
  updateSmtpSettings as updateSmtpSettingsInDb,
} from '@/data-access/admin'
import { listProjects } from '@/data-access/projects'
import { auth } from '@/lib/auth/server'
import { clearCacheStorage, getCacheStorageStats } from '@/lib/cdn/cache'
import { getQueueStats } from '@/lib/concurrency'
import { sendSmtpMail, verifySmtp } from '@/lib/email/smtp'
import type {
  acceptInvitationSchema,
  cacheMaintenanceSchema,
  createInvitationSchema,
} from '@/schemas/admin'
import { ACTIVITY_PAGE_SIZE } from '@/schemas/admin'
import type { createApiKeySchema } from '@/schemas/api-keys'

const DEFAULT_ORG = 'org_default'
const INTERNAL_API_KEY_CONFIG = 'internal'
const INTERNAL_API_KEY_PERMISSIONS = {
  projects: ['read', 'write'],
}

export async function getAdminWorkspace() {
  const [
    users,
    invitations,
    smtp,
    apiKeys,
    apiKeyActivities,
    apiKeyActivitiesTotal,
    projects,
  ] = await Promise.all([
    listStaffUsers(),
    listInvitations(),
    getPublicSmtpSettings(),
    listInternalApiKeys(INTERNAL_API_KEY_CONFIG),
    listApiKeyActivities(INTERNAL_API_KEY_CONFIG, 0, ACTIVITY_PAGE_SIZE),
    countApiKeyActivities(INTERNAL_API_KEY_CONFIG),
    listProjects(DEFAULT_ORG),
  ])
  return {
    users,
    invitations,
    smtp,
    apiKeys,
    apiKeyActivities,
    apiKeyActivitiesTotal,
    projects,
  }
}

export async function listApiKeyActivitiesPage(page: number) {
  const safePage = Math.max(1, page)
  const [activities, total] = await Promise.all([
    listApiKeyActivities(
      INTERNAL_API_KEY_CONFIG,
      (safePage - 1) * ACTIVITY_PAGE_SIZE,
      ACTIVITY_PAGE_SIZE,
    ),
    countApiKeyActivities(INTERNAL_API_KEY_CONFIG),
  ])
  return { activities, total }
}

export function createApiKey(
  input: z.output<typeof createApiKeySchema> & { userId: string },
) {
  return auth.api.createApiKey({
    body: {
      configId: INTERNAL_API_KEY_CONFIG,
      name: input.name,
      userId: input.userId,
      permissions: INTERNAL_API_KEY_PERMISSIONS,
      metadata: input.projectId ? { projectId: input.projectId } : null,
    },
  })
}

export function disableApiKey(id: string) {
  return disableInternalApiKey(id, INTERNAL_API_KEY_CONFIG)
}

export function createApiKeyActivity(input: NewApiKeyActivity) {
  return createApiKeyActivityInDb(input)
}

export async function createInvitation(
  input: z.output<typeof createInvitationSchema> & { invitedById: string },
) {
  const invitation = await createStaffInvitation({
    email: input.email,
    role: input.role,
    expiresDays: input.expiresDays,
    invitedById: input.invitedById,
  })
  if (input.sendEmail) {
    const settings = await getEffectiveSmtpSettings()
    if (!settings) {
      throw new Error('SMTP is not configured')
    }
    await sendSmtpMail(settings, {
      to: invitation.email,
      subject: 'You are invited to Keenpix',
      text: `Use this invitation link to join Keenpix:\n\n${invitation.inviteLink}`,
      html: `<p>Use this invitation link to join Keenpix:</p><p><a href="${invitation.inviteLink}">${invitation.inviteLink}</a></p>`,
    })
  }
  return invitation
}

export function revokeInvitation(id: string) {
  return revokeInvitationInDb(id)
}

export function getInvitation(token: string) {
  return getInvitationByToken(token)
}

export function acceptInvitation(
  input: z.output<typeof acceptInvitationSchema>,
) {
  return acceptInvitationInDb(input)
}

export function updateSmtpSettings(input: SmtpSettingsInput) {
  return updateSmtpSettingsInDb(input)
}

export async function sendTestEmail(to: string) {
  const settings = await getEffectiveSmtpSettings()
  if (!settings) {
    throw new Error('SMTP is not configured')
  }
  await verifySmtp(settings)
  await sendSmtpMail(settings, {
    to,
    subject: 'Keenpix test email',
    text: 'SMTP is configured correctly for this Keenpix instance.',
    html: '<p>SMTP is configured correctly for this Keenpix instance.</p>',
  })
  return { ok: true }
}

export async function getOperationsHealth() {
  const [cache, projects] = await Promise.all([
    getCacheStorageStats(),
    listProjects(DEFAULT_ORG),
  ])
  return {
    cache,
    generatedAt: dayjs().toISOString(),
    projectCount: projects.length,
    transformQueue: getQueueStats(),
    uptimeSeconds: Math.round(process.uptime()),
  }
}

export function runCacheMaintenance(
  input: z.output<typeof cacheMaintenanceSchema>,
) {
  return clearCacheStorage(input.target)
}
