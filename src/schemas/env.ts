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
  KEENPIX_SELF_HOST: z.enum(['true', 'false', '1', '0']).optional(),
  KEENPIX_CACHE_DIR: z.string().min(1).default('./.keenpix-cache'),
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
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.enum(['true', 'false', '1', '0']).optional(),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  SMTP_FROM_EMAIL: z.email().optional(),
  SMTP_FROM_NAME: z.string().min(1).optional(),
}

export const clientEnvSchema = {
  VITE_KEENPIX_PUBLIC_URL: optionalUrlSchema,
  VITE_KEENPIX_AUTH_URL: optionalUrlSchema,
  VITE_BETTER_AUTH_URL: optionalUrlSchema,
}
