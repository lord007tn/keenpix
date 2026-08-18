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
      if (Boolean(value.SMTP_USER) !== Boolean(value.SMTP_PASSWORD)) {
        const missing = value.SMTP_USER ? 'SMTP_PASSWORD' : 'SMTP_USER'
        ctx.addIssue({
          code: 'custom',
          path: [missing],
          message: 'SMTP_USER and SMTP_PASSWORD must be configured together.',
        })
      }
      if (
        Boolean(value.GOOGLE_CLIENT_ID) !== Boolean(value.GOOGLE_CLIENT_SECRET)
      ) {
        ctx.addIssue({
          code: 'custom',
          path: [
            value.GOOGLE_CLIENT_ID
              ? 'GOOGLE_CLIENT_SECRET'
              : 'GOOGLE_CLIENT_ID',
          ],
          message:
            'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured together.',
        })
      }
      const cloudflareSaasValues = [
        value.CLOUDFLARE_SAAS_API_TOKEN,
        value.CLOUDFLARE_SAAS_ZONE_ID,
        value.CLOUDFLARE_SAAS_CNAME_TARGET,
        value.CLOUDFLARE_SAAS_EDGE_SECRET,
      ]
      if (
        cloudflareSaasValues.some(Boolean) &&
        !cloudflareSaasValues.every(Boolean)
      ) {
        const when =
          'when any Cloudflare for SaaS custom-domain variable is configured'
        requireVar(
          'CLOUDFLARE_SAAS_API_TOKEN',
          value.CLOUDFLARE_SAAS_API_TOKEN,
          when,
        )
        requireVar(
          'CLOUDFLARE_SAAS_ZONE_ID',
          value.CLOUDFLARE_SAAS_ZONE_ID,
          when,
        )
        requireVar(
          'CLOUDFLARE_SAAS_CNAME_TARGET',
          value.CLOUDFLARE_SAAS_CNAME_TARGET,
          when,
        )
        requireVar(
          'CLOUDFLARE_SAAS_EDGE_SECRET',
          value.CLOUDFLARE_SAAS_EDGE_SECRET,
          when,
        )
      }
      if (
        value.POLAR_SANDBOX_WEBHOOK_SECRET &&
        value.POLAR_SANDBOX_WEBHOOK_SECRET === value.POLAR_WEBHOOK_SECRET
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['POLAR_SANDBOX_WEBHOOK_SECRET'],
          message:
            'POLAR_SANDBOX_WEBHOOK_SECRET must differ from POLAR_WEBHOOK_SECRET.',
        })
      }
      // Any production deploy (self-host or cloud) needs a database and a real
      // auth secret, or it boots green and then crashes on the first request.
      if (value.NODE_ENV === 'production') {
        const when = 'in a production build'
        requireVar('DATABASE_URL', value.DATABASE_URL, when)
        requireVar('BETTER_AUTH_SECRET', value.BETTER_AUTH_SECRET, when)
        requireVar('KEENPIX_WORKER_SECRET', value.KEENPIX_WORKER_SECRET, when)
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
        requireVar('CLOUDFLARE_API_TOKEN', value.CLOUDFLARE_API_TOKEN, when)
        requireVar(
          'CLOUDFLARE_ACCOUNT_API_TOKEN',
          value.CLOUDFLARE_ACCOUNT_API_TOKEN,
          when,
        )
        requireVar('CLOUDFLARE_ACCOUNT_ID', value.CLOUDFLARE_ACCOUNT_ID, when)
        requireVar('CLOUDFLARE_ZONE_ID', value.CLOUDFLARE_ZONE_ID, when)
        requireVar('KEENPIX_DEPLOYMENT_ENV', value.KEENPIX_DEPLOYMENT_ENV, when)
        // POLAR_SERVER defaults to "sandbox"; require it explicitly in cloud.
        // The public keenpix.com deployment must use production, while a separate
        // staging hostname may deliberately use the Polar sandbox.
        requireVar('POLAR_SERVER', value.POLAR_SERVER, when)
        const appUrl = value.KEENPIX_APP_URL ?? value.BETTER_AUTH_URL
        requireVar('KEENPIX_APP_URL', appUrl, when)
        const appHostname = appUrl ? new URL(appUrl).hostname : undefined
        if (value.KEENPIX_DEPLOYMENT_ENV === 'production' && appUrl) {
          const url = new URL(appUrl)
          if (
            url.protocol !== 'https:' ||
            url.hostname === 'localhost' ||
            url.hostname === '127.0.0.1' ||
            url.hostname === '::1'
          ) {
            ctx.addIssue({
              code: 'custom',
              path: ['KEENPIX_APP_URL'],
              message:
                'Production cloud deployments require a public HTTPS KEENPIX_APP_URL or BETTER_AUTH_URL.',
            })
          }
          if (value.POLAR_SERVER !== 'production') {
            ctx.addIssue({
              code: 'custom',
              path: ['POLAR_SERVER'],
              message:
                'POLAR_SERVER must be "production" when KEENPIX_DEPLOYMENT_ENV="production".',
            })
          }
          if (
            value.EMAIL_PROVIDER === 'smtp' &&
            (value.SMTP_HOST === 'mailpit' ||
              value.SMTP_FROM_EMAIL?.endsWith('.test'))
          ) {
            ctx.addIssue({
              code: 'custom',
              path: ['SMTP_HOST'],
              message:
                'Production cloud email cannot use the bundled Mailpit or a .test sender.',
            })
          }
        }
        if (
          value.KEENPIX_DEPLOYMENT_ENV === 'staging' &&
          value.POLAR_SERVER !== 'sandbox'
        ) {
          ctx.addIssue({
            code: 'custom',
            path: ['POLAR_SERVER'],
            message:
              'POLAR_SERVER must be "sandbox" when KEENPIX_DEPLOYMENT_ENV="staging".',
          })
        }
        if (
          value.POLAR_SERVER === 'sandbox' &&
          (appHostname === 'keenpix.com' || appHostname === 'www.keenpix.com')
        ) {
          ctx.addIssue({
            code: 'custom',
            path: ['POLAR_SERVER'],
            message:
              'POLAR_SERVER must be "production" for the keenpix.com cloud deployment (got "sandbox"). Use a separate non-production hostname for Polar sandbox callbacks.',
          })
        }
      }
    }),
})
