import { Resend } from 'resend'
import type { EmailConfig, MailInput } from './types'

export async function sendResendMail(
  input: MailInput,
  config: Extract<EmailConfig, { provider: 'resend' }>,
) {
  if (!(config.token && config.from)) {
    throw new Error('Resend is not configured')
  }
  const resend = new Resend(config.token)
  const { error } = await resend.emails.send({
    from: config.from,
    html: input.html,
    subject: input.subject,
    text: input.text,
    to: input.to,
  })
  if (error) {
    throw new Error(`Resend send failed (${error.statusCode ?? error.name})`)
  }
}
