import type { EmailConfig, MailInput } from './types'

export async function sendPostmarkMail(
  input: MailInput,
  config: Extract<EmailConfig, { provider: 'postmark' }>,
) {
  if (!(config.token && config.from)) {
    throw new Error('Postmark is not configured')
  }
  const response = await fetch('https://api.postmarkapp.com/email', {
    body: JSON.stringify({
      From: config.from,
      HtmlBody: input.html,
      MessageStream: config.messageStream ?? 'outbound',
      Subject: input.subject,
      TextBody: input.text,
      To: input.to,
    }),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': config.token,
    },
    method: 'POST',
    signal: AbortSignal.timeout(15_000),
  })
  const result = (await response.json().catch(() => null)) as {
    ErrorCode?: unknown
  } | null
  if (!response.ok || result?.ErrorCode !== 0) {
    const code =
      typeof result?.ErrorCode === 'number' ? `, code ${result.ErrorCode}` : ''
    throw new Error(`Postmark send failed (${response.status}${code})`)
  }
}
