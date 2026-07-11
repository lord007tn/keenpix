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
  const result = (await res.json().catch(() => null)) as {
    ErrorCode?: unknown
  } | null
  if (!res.ok || result?.ErrorCode !== 0) {
    const code =
      typeof result?.ErrorCode === 'number' ? `, code ${result.ErrorCode}` : ''
    // Postmark error messages can contain the recipient address (for example,
    // an inactive-recipient response). Keep PII out of application logs while
    // retaining the HTTP/API codes operators need to investigate in Postmark.
    throw new Error(`Postmark send failed (${res.status}${code})`)
  }
}
