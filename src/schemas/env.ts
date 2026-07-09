import { z } from 'zod'
import { optionalUrlSchema } from './common'

const DEFAULT_CACHE_MAX_BYTES = 2 * 1024 * 1024 * 1024

export const serverEnvSchema = {
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  DATABASE_URL: z.string().min(1).optional(),
  BETTER_AUTH_SECRET: z.string().min(1).optional(),
  BETTER_AUTH_URL: optionalUrlSchema,
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  KEENPIX_APP_URL: optionalUrlSchema,
  // The single deployment switch. `cloud` enables the multi-tenant hosted product
  // (self-signup, billing, quotas, shared cache, marketing site); `selfhost` is
  // the default so every existing deployment stays single-tenant. Self-host is
  // just `!isCloud()` — there is no separate KEENPIX_SELF_HOST flag.
  KEENPIX_MODE: z.enum(['selfhost', 'cloud']).default('selfhost'),
  KEENPIX_CACHE_DIR: z.string().min(1).default('./.keenpix-cache'),
  // Optional shared object-storage cache tier (Cloudflare R2 / any S3). When all
  // are set AND KEENPIX_MODE=cloud, the durable cache moves off local disk to a
  // shared bucket so horizontally-scaled cloud replicas share one warm cache.
  // Self-host leaves these unset and keeps the disk cache.
  KEENPIX_CACHE_S3_BUCKET: z.string().min(1).optional(),
  KEENPIX_CACHE_S3_ENDPOINT: optionalUrlSchema,
  KEENPIX_CACHE_S3_REGION: z.string().min(1).optional(),
  KEENPIX_CACHE_S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  KEENPIX_CACHE_S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  // Polar billing (cloud only). The billing plugin activates when running
  // KEENPIX_MODE=cloud with an access token set; self-host leaves these unset.
  POLAR_TOKEN: z.string().min(1).optional(),
  POLAR_SERVER: z.enum(['sandbox', 'production']).optional(),
  POLAR_WEBHOOK_SECRET: z.string().min(1).optional(),
  POLAR_SUCCESS_URL: z.string().min(1).optional(),
  // Shared secret for machine-triggered internal jobs (usage metering cron).
  // The scheduler sends `Authorization: Bearer $CRON_SECRET`.
  CRON_SECRET: z.string().min(1).optional(),
  // Transactional email. Platform email (verification, password reset, teammate
  // invitations) sends through exactly ONE provider, chosen by EMAIL_PROVIDER.
  // Leave it unset to disable email (e.g. a self-host install that never invites
  // teammates); when set, the matching provider's vars below are required and
  // validated at startup (see src/env/server.ts), so only one provider is ever
  // active. The from-address domain must be a verified sender for that provider.
  //   postmark -> POSTMARK_API_KEY + POSTMARK_FROM (+ POSTMARK_MESSAGE_STREAM)
  //   resend   -> RESEND_API_KEY + RESEND_FROM
  //   smtp     -> SMTP_HOST + SMTP_FROM_EMAIL (+ SMTP_PORT/SECURE/USER/PASSWORD/FROM_NAME)
  EMAIL_PROVIDER: z.enum(['postmark', 'resend', 'smtp']).optional(),
  POSTMARK_API_KEY: z.string().min(1).optional(),
  POSTMARK_FROM: z.string().min(1).optional(),
  POSTMARK_MESSAGE_STREAM: z.string().min(1).default('outbound'),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM: z.string().min(1).optional(),
  // ClickHouse (optional) powers advanced analytics + full-history advanced logs
  // by mirroring raw request events into a columnar store. When CLICKHOUSE_URL
  // is unset, keenpix reads/writes analytics + logs from Postgres only (the
  // current behavior), so self-host and un-provisioned cloud are unaffected.
  CLICKHOUSE_URL: optionalUrlSchema,
  CLICKHOUSE_DATABASE: z.string().min(1).default('keenpix'),
  CLICKHOUSE_USER: z.string().min(1).default('default'),
  CLICKHOUSE_PASSWORD: z.string().optional(),
  KEENPIX_CACHE_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(DEFAULT_CACHE_MAX_BYTES),
  KEENPIX_CACHE_STALE_MS: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(24 * 60 * 60 * 1000),
  KEENPIX_MEMORY_CACHE_MAX_BYTES: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(64 * 1024 * 1024),
  // The Cache-Control header emitted on transform responses. Long-lived +
  // immutable by default so an outer CDN can cache transform output; override to
  // tune edge/browser TTLs without a code change.
  KEENPIX_CACHE_CONTROL: z
    .string()
    .min(1)
    .default('public, max-age=31536000, immutable'),
  KEENPIX_MAX_ORIGIN_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(50 * 1024 * 1024),
  KEENPIX_MAX_INPUT_PIXELS: z.coerce
    .number()
    .int()
    .positive()
    .default(50_000_000),
  KEENPIX_MAX_DIMENSION: z.coerce.number().int().positive().default(4096),
  KEENPIX_ORIGIN_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  KEENPIX_MAX_CONCURRENCY: z.coerce.number().int().positive().optional(),
  KEENPIX_MAX_QUEUE: z.coerce.number().int().positive().default(100),
  KEENPIX_SUPER_ADMIN_EMAIL: z.email().optional(),
  KEENPIX_SUPER_ADMIN_PASSWORD: z.string().min(1).optional(),
  KEENPIX_ADMIN_EMAIL: z.email().optional(),
  KEENPIX_ADMIN_PASSWORD: z.string().min(1).optional(),
  // SMTP transactional email (EMAIL_PROVIDER=smtp). Point at any SMTP relay
  // (provider or self-hosted Postfix/Mailpit). SMTP_HOST + SMTP_FROM_EMAIL are
  // the minimum; the rest are optional.
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.enum(['true', 'false', '1', '0']).optional(),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  SMTP_FROM_EMAIL: z.email().optional(),
  SMTP_FROM_NAME: z.string().min(1).optional(),
  // Optional Cloudflare edge-analytics fallback. Used when database-managed
  // Cloudflare settings (Settings -> CDN cache) are not enabled.
  CLOUDFLARE_API_TOKEN: z.string().min(1).optional(),
  CLOUDFLARE_ZONE_ID: z.string().min(1).optional(),
  CLOUDFLARE_HOST: z.string().min(1).optional(),
}

export const clientEnvSchema = {
  VITE_KEENPIX_PUBLIC_URL: optionalUrlSchema,
  VITE_KEENPIX_AUTH_URL: optionalUrlSchema,
  VITE_BETTER_AUTH_URL: optionalUrlSchema,
}
