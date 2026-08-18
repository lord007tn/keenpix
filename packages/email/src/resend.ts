import type { EmailConfig, MailInput } from './types'

export async function sendResendMail(
  input: MailInput,
  config: Extract<EmailConfig, { provider: 'resend' }>,
) {
  if (!(config.token && config.from)) {
    throw new Error('Resend is not configured')
  }
  const response = await fetch('https://api.resend.com/emails', {
    body: JSON.stringify({
      from: config.from,
      html: input.html,
      subject: input.subject,
      text: input.text,
      to: input.to,
    }),
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) {
    throw new Error(`Resend send failed (${response.status})`)
  }
}
