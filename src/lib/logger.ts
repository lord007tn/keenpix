import pino from 'pino'
import { env } from '@/env/server'

export const logger = pino({
  base: {
    service: 'keenpix',
  },
  level: env.LOG_LEVEL,
})

export function errorContext(error: unknown) {
  if (!(error instanceof Error)) {
    return { error: String(error) }
  }

  return {
    error: error.message,
    name: error.name,
    stack: env.NODE_ENV === 'production' ? undefined : error.stack,
    cause:
      error.cause instanceof Error
        ? {
            message: error.cause.message,
            name: error.cause.name,
          }
        : error.cause,
  }
}
