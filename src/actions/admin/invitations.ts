import type { z } from 'zod'
import {
  acceptInvitation as acceptInvitationInDb,
  createStaffInvitation,
  getInvitationByToken,
  revokeInvitation as revokeInvitationInDb,
} from '@/data-access/admin/invitations'
import { getEffectiveSmtpSettings } from '@/data-access/admin/smtp'
import { sendSmtpMail } from '@/lib/email/smtp'
import type {
  acceptInvitationSchema,
  createInvitationSchema,
} from '@/schemas/admin'

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
