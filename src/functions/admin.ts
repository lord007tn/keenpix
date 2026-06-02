import { createServerFn } from '@tanstack/react-start'
import {
  acceptInvitation,
  createStaffInvitation,
  disableInternalApiKey,
  getEffectiveSmtpSettings,
  getInvitationByToken,
  getPublicSmtpSettings,
  listInternalApiKeys,
  listInvitations,
  listStaffUsers,
  revokeInvitation,
  updateSmtpSettings,
} from '@/data-access/admin'
import { listProjects } from '@/data-access/projects'
import { authMiddleware, requireSuperAdmin } from '@/lib/auth/guards'
import { auth } from '@/lib/auth/server'
import { sendSmtpMail, verifySmtp } from '@/lib/email/smtp'
import {
  acceptInvitationSchema,
  createInvitationSchema,
  invitationTokenSchema,
  revokeInvitationSchema,
  sendTestEmailSchema,
  smtpSettingsSchema,
} from '@/schemas/admin'
import { createApiKeySchema, disableApiKeySchema } from '@/schemas/api-keys'

const DEFAULT_ORG = 'org_default'
const INTERNAL_API_KEY_CONFIG = 'internal'
const INTERNAL_API_KEY_PERMISSIONS = {
  projects: ['read', 'write'],
}

export const getAdminWorkspaceFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    requireSuperAdmin(context)
    const [users, invitations, smtp, apiKeys, projects] = await Promise.all([
      listStaffUsers(),
      listInvitations(),
      getPublicSmtpSettings(),
      listInternalApiKeys(INTERNAL_API_KEY_CONFIG),
      listProjects(DEFAULT_ORG),
    ])
    return { users, invitations, smtp, apiKeys, projects }
  })

export const createApiKeyFn = createServerFn({ method: 'POST' })
  .inputValidator(createApiKeySchema)
  .middleware([authMiddleware])
  .handler(({ context, data }) => {
    requireSuperAdmin(context)
    return auth.api.createApiKey({
      body: {
        configId: INTERNAL_API_KEY_CONFIG,
        name: data.name,
        userId: context.userId,
        permissions: INTERNAL_API_KEY_PERMISSIONS,
        metadata: data.projectId ? { projectId: data.projectId } : null,
      },
    })
  })

export const disableApiKeyFn = createServerFn({ method: 'POST' })
  .inputValidator(disableApiKeySchema)
  .middleware([authMiddleware])
  .handler(({ context, data }) => {
    requireSuperAdmin(context)
    return disableInternalApiKey(data.id, INTERNAL_API_KEY_CONFIG)
  })

export const createInvitationFn = createServerFn({ method: 'POST' })
  .inputValidator(createInvitationSchema)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    requireSuperAdmin(context)
    const invitation = await createStaffInvitation({
      email: data.email,
      role: data.role,
      expiresDays: data.expiresDays,
      invitedById: context.userId,
    })
    if (data.sendEmail) {
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
  })

export const revokeInvitationFn = createServerFn({ method: 'POST' })
  .inputValidator(revokeInvitationSchema)
  .middleware([authMiddleware])
  .handler(({ context, data }) => {
    requireSuperAdmin(context)
    return revokeInvitation(data.id)
  })

export const getInvitationFn = createServerFn({ method: 'GET' })
  .inputValidator(invitationTokenSchema)
  .handler(async ({ data }) => getInvitationByToken(data.token))

export const acceptInvitationFn = createServerFn({ method: 'POST' })
  .inputValidator(acceptInvitationSchema)
  .handler(async ({ data }) => acceptInvitation(data))

export const updateSmtpSettingsFn = createServerFn({ method: 'POST' })
  .inputValidator(smtpSettingsSchema)
  .middleware([authMiddleware])
  .handler(({ context, data }) => {
    requireSuperAdmin(context)
    return updateSmtpSettings({
      enabled: data.enabled,
      host: data.host,
      port: data.port,
      secure: data.secure,
      username: data.username,
      password: data.password || undefined,
      fromEmail: data.fromEmail,
      fromName: data.fromName,
    })
  })

export const sendTestEmailFn = createServerFn({ method: 'POST' })
  .inputValidator(sendTestEmailSchema)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    requireSuperAdmin(context)
    const settings = await getEffectiveSmtpSettings()
    if (!settings) {
      throw new Error('SMTP is not configured')
    }
    await verifySmtp(settings)
    await sendSmtpMail(settings, {
      to: data.to,
      subject: 'Keenpix test email',
      text: 'SMTP is configured correctly for this Keenpix instance.',
      html: '<p>SMTP is configured correctly for this Keenpix instance.</p>',
    })
    return { ok: true }
  })
