import { z } from 'zod'

export const env = z
  .object({
    KEENPIX_APP_URL: z.url(),
    KEENPIX_QUEUE_URL: z.url().default('redis://127.0.0.1:6379'),
    KEENPIX_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(4),
    KEENPIX_WORKER_SECRET: z.string().min(32),
    KEENPIX_WORKER_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(60_000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
  })
  .parse(process.env)
