import type { z } from 'zod'
import {
  acceptInvitation as acceptInvitationInDb,
  createStaffInvitation,
  disableInternalApiKey,
  getEffectiveSmtpSettings,
  getInvitationByToken,
  getPublicSmtpSettings,
  listInternalApiKeys,
  listInvitations,
  listStaffUsers,
  revokeInvitation as revokeInvitationInDb,
  type SmtpSettingsInput,
  updateSmtpSettings as updateSmtpSettingsInDb,
} from '@/data-access/admin'
import { listProjects } from '@/data-access/projects'
import { auth } from '@/lib/auth/server'
import { sendSmtpMail, verifySmtp } from '@/lib/email/smtp'
import type {
  acceptInvitationSchema,
  createInvitationSchema,
} from '@/schemas/admin'
import type { createApiKeySchema } from '@/schemas/api-keys'

const DEFAULT_ORG = 'org_default'
const INTERNAL_API_KEY_CONFIG = 'internal'
const INTERNAL_API_KEY_PERMISSIONS = {
  projects: ['read', 'write'],
}

export async function getAdminWorkspace() {
  const [users, invitations, smtp, apiKeys, projects] = await Promise.all([
    listStaffUsers(),
    listInvitations(),
    getPublicSmtpSettings(),
    listInternalApiKeys(INTERNAL_API_KEY_CONFIG),
    listProjects(DEFAULT_ORG),
  ])
  return { users, invitations, smtp, apiKeys, projects }
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
