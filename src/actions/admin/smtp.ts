import {
  getEffectiveSmtpSettings,
  type SmtpSettingsInput,
  updateSmtpSettings as updateSmtpSettingsInDb,
} from '@/data-access/admin/smtp'
import { sendSmtpMail, verifySmtp } from '@/lib/email/smtp'

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
