import type { DrainContext, LogLevel } from 'evlog'
import { log as evlog, initLogger } from 'evlog'
import { createFsDrain } from 'evlog/fs'
import { createDrainPipeline } from 'evlog/pipeline'

export type KeenpixLogLevel =
  | 'fatal'
  | 'error'
  | 'warn'
  | 'info'
  | 'debug'
  | 'trace'
  | 'silent'

export interface LoggerOptions {
  environment?: string
  level?: KeenpixLogLevel
  logDir?: string
  service: string
  version?: string
}

type LogInput = Error | Record<string, unknown> | string | unknown

export interface Logger {
  child(bindings: Record<string, unknown>): Logger
  debug(input: LogInput, message?: string): void
  error(input: LogInput, message?: string): void
  info(input: LogInput, message?: string): void
  warn(input: LogInput, message?: string): void
}

let initialized = false
let fileDrain: ReturnType<ReturnType<typeof createDrainPipeline<DrainContext>>>

function getEvlogLevel(level: KeenpixLogLevel): LogLevel {
  if (level === 'fatal') {
    return 'error'
  }
  if (level === 'trace') {
    return 'debug'
  }
  if (level === 'silent') {
    return 'error'
  }
  return level
}

export function initializeLogger(options: LoggerOptions) {
  if (initialized) {
    return
  }

  const level = options.level ?? 'info'
  if (options.logDir) {
    const writeLogs = createFsDrain({
      dir: options.logDir,
      maxFiles: 14,
      maxSizePerFile: 25 * 1024 * 1024,
      pretty: false,
    })
    fileDrain = createDrainPipeline<DrainContext>({
      batch: { intervalMs: 1000, size: 50 },
      maxBufferSize: 2000,
      onDropped: (events, error) => {
        process.stderr.write(
          `[evlog] Dropped ${events.length} log events: ${String(error)}\n`,
        )
      },
      retry: { maxAttempts: 3 },
    })(writeLogs)
  }

  initLogger({
    drain: fileDrain,
    enabled: level !== 'silent',
    env: {
      environment: options.environment ?? process.env.NODE_ENV,
      service: options.service,
      version: options.version,
    },
    minLevel: getEvlogLevel(level),
    pretty: options.environment !== 'production',
    redact: {
      builtins: [
        'bearer',
        'creditCard',
        'email',
        'iban',
        'ipv4',
        'jwt',
        'phone',
      ],
      paths: [
        'authorization',
        'cookie',
        'headers.authorization',
        'headers.cookie',
        '**.password',
        '**.secret',
        '**.token',
      ],
    },
  })
  initialized = true
}

export async function flushLogger() {
  await fileDrain?.flush()
}

export function getErrorContext(error: unknown, includeStack = false) {
  if (!(error instanceof Error)) {
    return { error: String(error) }
  }

  return {
    cause:
      error.cause instanceof Error
        ? {
            message: error.cause.message,
            name: error.cause.name,
          }
        : error.cause,
    error: error.message,
    name: error.name,
    stack: includeStack ? error.stack : undefined,
  }
}

function normalizeError(error: Error) {
  return {
    ...getErrorContext(error, process.env.NODE_ENV !== 'production'),
    code: 'code' in error ? String(error.code) : undefined,
  }
}

export function createLogger(bindings: Record<string, unknown> = {}): Logger {
  const write = (level: LogLevel, input: LogInput, message?: string) => {
    const event: Record<string, unknown> = { ...bindings }

    if (input instanceof Error) {
      event.error = normalizeError(input)
    } else if (input && typeof input === 'object') {
      Object.assign(event, input)
      if (event.error instanceof Error) {
        event.error = normalizeError(event.error)
      }
      if (event.err instanceof Error) {
        event.error = normalizeError(event.err)
        event.err = undefined
      }
    } else if (typeof input === 'string') {
      event.message = input
    } else {
      event.value = String(input)
    }

    if (message) {
      event.message = message
    }
    evlog[level](event)
  }

  return {
    child: (childBindings) => createLogger({ ...bindings, ...childBindings }),
    debug: (input, message) => write('debug', input, message),
    error: (input, message) => write('error', input, message),
    info: (input, message) => write('info', input, message),
    warn: (input, message) => write('warn', input, message),
  }
}

export const logger = createLogger()
