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
    signal: AbortSignal.timeout(15_000),
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
    // Provider bodies can echo recipient addresses. Keep PII out of logs while
    // retaining the HTTP status operators need to investigate in Resend.
    throw new Error(`Resend send failed (${res.status})`)
  }
}
