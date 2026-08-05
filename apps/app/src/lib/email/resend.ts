import { env } from '@/env/server'
import type { MailInput } from './types'

// Transactional email via Resend (EMAIL_PROVIDER=resend). Uses RESEND_API_KEY /
// RESEND_FROM. The from-address domain must be a verified domain in the Resend
// account or the API rejects the send.
export async function sendResendMail(input: MailInput): Promise<void> {
  const token = env.RESEND_API_KEY
  const from = env.RESEND_FROM
  if (!(token && from)) {
    throw new Error('Resend is not configured')
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(
      `Resend send failed (${res.status}): ${detail.slice(0, 300)}`,
    )
  }
}
