import { z } from 'zod'

export const env = z
  .object({
    KEENPIX_TRANSFORM_URL: z.url(),
    KEENPIX_LOG_DIR: z.string().min(1).optional(),
    KEENPIX_QUEUE_URL: z.url().default('redis://127.0.0.1:6379'),
    KEENPIX_WORKBENCH_PASSWORD: z.string().min(1).optional(),
    KEENPIX_WORKBENCH_USERNAME: z.string().min(1).optional(),
    KEENPIX_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(4),
    KEENPIX_WORKER_PORT: z.coerce.number().int().positive().default(3001),
    KEENPIX_WORKER_SECRET: z.string().min(32),
    KEENPIX_WORKER_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(60_000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    NODE_ENV: z
      .enum(['development', 'production', 'test', 'staging'])
      .default('development'),
  })
  .superRefine((value, context) => {
    if (
      Boolean(value.KEENPIX_WORKBENCH_USERNAME) !==
      Boolean(value.KEENPIX_WORKBENCH_PASSWORD)
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'KEENPIX_WORKBENCH_USERNAME and KEENPIX_WORKBENCH_PASSWORD must be set together',
        path: ['KEENPIX_WORKBENCH_USERNAME'],
      })
    }
  })
  .parse(
    Object.fromEntries(
      Object.entries(process.env).map(([key, value]) => [
        key,
        value === '' ? undefined : value,
      ]),
    ),
  )
