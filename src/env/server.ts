import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'
import { serverEnvSchema } from '@/schemas/env'

export const env = createEnv({
  server: serverEnvSchema,
  clientPrefix: 'VITE_',
  client: {},
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  isServer: true,
  // Cross-field validation, enforced once at boot so misconfiguration fails fast
  // (loudly, listing everything missing) instead of surfacing later as broken
  // sends, dead signups, or universal 402s.
  createFinalSchema: (shape) =>
    z.object(shape).superRefine((value, ctx) => {
      const requireVar = (key: string, present: unknown, reason: string) => {
        if (!present) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: `${key} is required ${reason}.`,
          })
        }
      }
      // Selected email provider must carry its own credentials — keeps "exactly
      // one active provider" honest.
      if (value.EMAIL_PROVIDER === 'postmark') {
        const when = 'when EMAIL_PROVIDER="postmark"'
        requireVar('POSTMARK_API_KEY', value.POSTMARK_API_KEY, when)
        requireVar('POSTMARK_FROM', value.POSTMARK_FROM, when)
      } else if (value.EMAIL_PROVIDER === 'resend') {
        const when = 'when EMAIL_PROVIDER="resend"'
        requireVar('RESEND_API_KEY', value.RESEND_API_KEY, when)
        requireVar('RESEND_FROM', value.RESEND_FROM, when)
      } else if (value.EMAIL_PROVIDER === 'smtp') {
        const when = 'when EMAIL_PROVIDER="smtp"'
        requireVar('SMTP_HOST', value.SMTP_HOST, when)
        requireVar('SMTP_FROM_EMAIL', value.SMTP_FROM_EMAIL, when)
      }
      // Multi-tenant cloud needs the full hosted stack or it boots green with
      // silently-dead signup (no email), billing, and serving (no Polar → 402s).
      if (value.KEENPIX_MODE === 'cloud') {
        const when = 'when KEENPIX_MODE="cloud"'
        requireVar('DATABASE_URL', value.DATABASE_URL, when)
        requireVar('BETTER_AUTH_SECRET', value.BETTER_AUTH_SECRET, when)
        requireVar('EMAIL_PROVIDER', value.EMAIL_PROVIDER, when)
        requireVar('POLAR_TOKEN', value.POLAR_TOKEN, when)
        requireVar('POLAR_WEBHOOK_SECRET', value.POLAR_WEBHOOK_SECRET, when)
        requireVar('CRON_SECRET', value.CRON_SECRET, when)
      }
    }),
})
