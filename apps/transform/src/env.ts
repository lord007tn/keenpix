import { z } from 'zod'

const optionalUrl = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.url().optional(),
)

export const env = z
  .object({
    CLOUDFLARE_SAAS_EDGE_SECRET: z.string().min(32).optional(),
    DATABASE_URL: z.string().min(1),
    KEENPIX_CACHE_CONTROL: z
      .string()
      .min(1)
      .default('public, max-age=31536000, immutable'),
    KEENPIX_CACHE_DIR: z.string().min(1).default('./.keenpix-cache'),
    KEENPIX_CACHE_MAX_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(2 * 1024 * 1024 * 1024),
    KEENPIX_CACHE_REDIS_URL: optionalUrl,
    KEENPIX_CACHE_S3_ACCESS_KEY_ID: z.string().min(1).optional(),
    KEENPIX_CACHE_S3_BUCKET: z.string().min(1).optional(),
    KEENPIX_CACHE_S3_ENDPOINT: optionalUrl,
    KEENPIX_CACHE_S3_REGION: z.string().min(1).optional(),
    KEENPIX_CACHE_S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    KEENPIX_CACHE_STALE_MS: z.coerce
      .number()
      .int()
      .nonnegative()
      .default(86_400_000),
    KEENPIX_MAX_DIMENSION: z.coerce.number().int().positive().default(4096),
    KEENPIX_MAX_INPUT_PIXELS: z.coerce
      .number()
      .int()
      .positive()
      .default(50_000_000),
    KEENPIX_MAX_ORIGIN_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(50 * 1024 * 1024),
    KEENPIX_MEMORY_CACHE_MAX_BYTES: z.coerce
      .number()
      .int()
      .nonnegative()
      .default(64 * 1024 * 1024),
    KEENPIX_MODE: z.enum(['cloud', 'selfhost']).default('selfhost'),
    KEENPIX_ORIGIN_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(10_000),
    KEENPIX_TRANSFORM_PORT: z.coerce.number().int().positive().default(3002),
    KEENPIX_WORKER_SECRET: z.string().min(32),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    KEENPIX_LOG_DIR: z.string().min(1).optional(),
    NODE_ENV: z
      .enum(['development', 'production', 'test', 'staging'])
      .default('development'),
  })
  .superRefine((value, context) => {
    const s3 = [
      value.KEENPIX_CACHE_S3_ACCESS_KEY_ID,
      value.KEENPIX_CACHE_S3_BUCKET,
      value.KEENPIX_CACHE_S3_ENDPOINT,
      value.KEENPIX_CACHE_S3_SECRET_ACCESS_KEY,
    ]
    if (s3.some(Boolean) && !s3.every(Boolean)) {
      context.addIssue({
        code: 'custom',
        message:
          'All KEENPIX_CACHE_S3_* connection values must be set together',
        path: ['KEENPIX_CACHE_S3_BUCKET'],
      })
    }
  })
  .parse(process.env)
