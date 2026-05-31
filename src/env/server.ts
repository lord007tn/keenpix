import 'dotenv/config'
import os from 'node:os'
import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

const DEFAULT_CACHE_MAX_BYTES = 2 * 1024 * 1024 * 1024

const optionalUrl = z.string().url().optional()

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    DATABASE_URL: z.string().min(1).optional(),
    BETTER_AUTH_SECRET: z.string().min(1).optional(),
    BETTER_AUTH_URL: optionalUrl,
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    KEENPIX_APP_URL: optionalUrl,
    KEENPIX_SELF_HOST: z.enum(['true', 'false', '1', '0']).optional(),
    KEENPIX_CACHE_DIR: z.string().min(1).default('./.keenpix-cache'),
    KEENPIX_CACHE_MAX_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(DEFAULT_CACHE_MAX_BYTES),
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
    KEENPIX_ORIGIN_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(10_000),
    KEENPIX_MAX_CONCURRENCY: z.coerce.number().int().positive().optional(),
    KEENPIX_MAX_QUEUE: z.coerce.number().int().positive().default(100),
    KEENPIX_ADMIN_EMAIL: z.string().email().optional(),
    KEENPIX_ADMIN_PASSWORD: z.string().min(1).optional(),
  },
  clientPrefix: 'VITE_',
  client: {},
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  isServer: true,
})

export const DEFAULT_MAX_CONCURRENCY = Math.max(2, os.cpus().length)
