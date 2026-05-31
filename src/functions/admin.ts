import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { authMiddleware, requireSuperAdmin } from '@/lib/auth/guards'

const roleSchema = z.enum(['admin', 'staff'])

const inviteSchema = z.object({
  email: z.email(),
  expiresDays: z.number().int().min(1).max(30).optional(),
  role: roleSchema.default('staff'),
  sendEmail: z.boolean().optional(),
})

const tokenSchema = z.object({
  token: z.string().min(20),
})

const acceptInviteSchema = z.object({
  name: z.string().max(80).optional(),
  password: z.string().min(8),
  token: z.string().min(20),
})

const revokeInviteSchema = z.object({
  id: z.string().min(1),
})

const smtpSchema = z.object({
  enabled: z.boolean(),
  fromEmail: z.email().or(z.literal('')).optional(),
  fromName: z.string().max(80).optional(),
  host: z.string().max(255).optional(),
  password: z.string().max(500).optional(),
  port: z.number().int().min(1).max(65_535),
  secure: z.boolean(),
  username: z.string().max(255).optional(),
})

const testEmailSchema = z.object({
  to: z.email(),
})

export const getAdminWorkspaceFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    requireSuperAdmin(context)
    const { getPublicSmtpSettings, listInvitations, listStaffUsers } =
      await import('@/data-access/admin')
    const [users, invitations, smtp] = await Promise.all([
      listStaffUsers(),
      listInvitations(),
      getPublicSmtpSettings(),
    ])
    return { users, invitations, smtp }
  })

export const createInvitationFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(inviteSchema)
  .handler(async ({ context, data }) => {
    requireSuperAdmin(context)
    const { createStaffInvitation, getEffectiveSmtpSettings } = await import(
      '@/data-access/admin'
    )
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
      const { sendSmtpMail } = await import('@/lib/email/smtp')
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
  .middleware([authMiddleware])
  .inputValidator(revokeInviteSchema)
  .handler(async ({ context, data }) => {
    requireSuperAdmin(context)
    const { revokeInvitation } = await import('@/data-access/admin')
    return revokeInvitation(data.id)
  })

export const getInvitationFn = createServerFn({ method: 'GET' })
  .inputValidator(tokenSchema)
  .handler(async ({ data }) => {
    const { getInvitationByToken } = await import('@/data-access/admin')
    return getInvitationByToken(data.token)
  })

export const acceptInvitationFn = createServerFn({ method: 'POST' })
  .inputValidator(acceptInviteSchema)
  .handler(async ({ data }) => {
    const { acceptInvitation } = await import('@/data-access/admin')
    return acceptInvitation(data)
  })

export const updateSmtpSettingsFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(smtpSchema)
  .handler(async ({ context, data }) => {
    requireSuperAdmin(context)
    const { updateSmtpSettings } = await import('@/data-access/admin')
    return updateSmtpSettings({
      enabled: data.enabled,
      host: data.host,
      port: data.port,
      secure: data.secure,
      username: data.username,
      password: data.password,
      fromEmail: data.fromEmail,
      fromName: data.fromName,
    })
  })

export const sendTestEmailFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(testEmailSchema)
  .handler(async ({ context, data }) => {
    requireSuperAdmin(context)
    const { getEffectiveSmtpSettings } = await import('@/data-access/admin')
    const settings = await getEffectiveSmtpSettings()
    if (!settings) {
      throw new Error('SMTP is not configured')
    }
    const { sendSmtpMail, verifySmtp } = await import('@/lib/email/smtp')
    await verifySmtp(settings)
    await sendSmtpMail(settings, {
      to: data.to,
      subject: 'Keenpix test email',
      text: 'SMTP is configured correctly for this Keenpix instance.',
      html: '<p>SMTP is configured correctly for this Keenpix instance.</p>',
    })
    return { ok: true }
  })
