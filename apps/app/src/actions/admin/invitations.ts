import { escapeEmailHtml } from '@keenpix/email'
import type { z } from 'zod'
import {
  acceptInvitation as acceptInvitationInDb,
  createStaffInvitation,
  getInvitationByToken,
  revokeInvitation as revokeInvitationInDb,
} from '@/data-access/admin/invitations'
import { sendPlatformEmail } from '@/lib/email/send'
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
    await sendPlatformEmail({
      to: invitation.email,
      subject: 'You are invited to Keenpix',
      text: `Use this invitation link to join Keenpix:\n\n${invitation.inviteLink}`,
      html: `<p>Use this invitation link to join Keenpix:</p><p><a href="${escapeEmailHtml(invitation.inviteLink)}">${escapeEmailHtml(invitation.inviteLink)}</a></p>`,
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
