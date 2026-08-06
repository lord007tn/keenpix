import { type MailInput, sendEmail } from '@keenpix/email'
import { env } from '@/env/server'

// Unified transactional email. Exactly one provider is ever active, selected by
// the EMAIL_PROVIDER env var (postmark | resend | smtp) and validated at startup
// in src/env/server.ts. Throws when no provider is configured so callers can
// surface a clear "email is not set up" error.
export function sendPlatformEmail(input: MailInput) {
  switch (env.EMAIL_PROVIDER) {
    case 'postmark':
      return sendEmail(input, {
        from: env.POSTMARK_FROM,
        messageStream: env.POSTMARK_MESSAGE_STREAM,
        provider: 'postmark',
        token: env.POSTMARK_API_KEY,
      })
    case 'resend':
      return sendEmail(input, {
        from: env.RESEND_FROM,
        provider: 'resend',
        token: env.RESEND_API_KEY,
      })
    case 'smtp':
      return sendEmail(input, {
        fromEmail: env.SMTP_FROM_EMAIL,
        fromName: env.SMTP_FROM_NAME,
        host: env.SMTP_HOST,
        password: env.SMTP_PASSWORD,
        port: env.SMTP_PORT,
        provider: 'smtp',
        secure: env.SMTP_SECURE === 'true' || env.SMTP_SECURE === '1',
        username: env.SMTP_USER,
      })
    default:
      return sendEmail(input, {})
  }
}
