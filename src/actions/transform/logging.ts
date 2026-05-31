import { errorContext, logger } from '@/lib/logger'

export function logPath(src: string) {
  try {
    return new URL(src).pathname
  } catch {
    return src.slice(0, 200)
  }
}

/** Log a server-side (5xx) transform failure with its underlying cause. */
export function logServerError(src: string, e: unknown) {
  logger.error(
    { ...errorContext(e), path: logPath(src) },
    'Image transform failed',
  )
}

export function logCacheWriteError(e: unknown) {
  logger.warn(errorContext(e), 'Cache write failed')
}
