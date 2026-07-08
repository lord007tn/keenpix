import { env } from '@/env/server'
import type { MailInput } from './types'

// Transactional email via Postmark (EMAIL_PROVIDER=postmark). Uses
// POSTMARK_API_KEY / POSTMARK_FROM / POSTMARK_MESSAGE_STREAM. The from-address
// domain must be a verified sender in the Postmark account or the API rejects it.
export async function sendPostmarkMail(input: MailInput): Promise<void> {
  const token = env.POSTMARK_API_KEY
  const from = env.POSTMARK_FROM
  if (!(token && from)) {
    throw new Error('Postmark is not configured')
  }
  const res = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': token,
    },
    body: JSON.stringify({
      From: from,
      To: input.to,
      Subject: input.subject,
      TextBody: input.text,
      HtmlBody: input.html,
      MessageStream: env.POSTMARK_MESSAGE_STREAM,
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(
      `Postmark send failed (${res.status}): ${detail.slice(0, 300)}`,
    )
  }
}
