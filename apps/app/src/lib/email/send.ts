import { env } from '@/env/server'
import { sendPostmarkMail } from './postmark'
import { sendResendMail } from './resend'
import { sendSmtpMail } from './smtp'
import type { MailInput } from './types'

// Unified transactional email. Exactly one provider is ever active, selected by
// the EMAIL_PROVIDER env var (postmark | resend | smtp) and validated at startup
// in src/env/server.ts. Throws when no provider is configured so callers can
// surface a clear "email is not set up" error.
export async function sendPlatformEmail(input: MailInput): Promise<void> {
  switch (env.EMAIL_PROVIDER) {
    case 'postmark':
      await sendPostmarkMail(input)
      return
    case 'resend':
      await sendResendMail(input)
      return
    case 'smtp':
      await sendSmtpMail(input)
      return
    default:
      throw new Error('Email is not configured (set EMAIL_PROVIDER)')
  }
}
