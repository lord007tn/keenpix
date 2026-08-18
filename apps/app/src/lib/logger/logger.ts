import {
  createLogger,
  getErrorContext,
  initializeLogger,
} from '@keenpix/logger'
import { env } from '@/env/server'

initializeLogger({
  environment: env.NODE_ENV,
  level: env.LOG_LEVEL,
  logDir: env.KEENPIX_LOG_DIR,
  service: 'keenpix-app',
  version: import.meta.env.VITE_APP_VERSION,
})

export const logger = createLogger()

export function errorContext(error: unknown) {
  return getErrorContext(error, env.NODE_ENV !== 'production')
}
