import { randomUUID } from 'node:crypto'
import { enterLogContext } from '@keenpix/logger'
import type { NitroAppPlugin } from 'nitro/types'
import { logger } from '@/lib/logger/logger'

// The orchestrator hits /api/health every ~10s; logging it would bury real traffic
// under health-check noise, so it's dropped from the access log.
const SILENT_PATHS = new Set(['/api/health'])
const VALID_REQUEST_ID_PATTERN = /^[\w\-=]{1,255}$/

// Correlate request-start → response by the event's identity. A WeakMap keeps this
// leak-free: the entry disappears when the event is garbage-collected, so a dropped
// connection (no `response` hook) can't accumulate.
const requestDetails = new WeakMap<
  object,
  { requestId: string; startedAt: number }
>()

// Structured access log for every dynamic request: method, path, status, latency.
// Nitro's `request`/`response` hooks wrap the h3 app, so this covers the transform
// endpoint, the SDK API, and SSR routes — giving prod a single stdout stream to
// watch for error rates and slow requests.
const plugin: NitroAppPlugin = (nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const incomingRequestId = event.req.headers.get('x-request-id')
    const requestId =
      incomingRequestId && VALID_REQUEST_ID_PATTERN.test(incomingRequestId)
        ? incomingRequestId
        : randomUUID()

    enterLogContext({ requestId })
    requestDetails.set(event, { requestId, startedAt: performance.now() })
  })
  nitroApp.hooks.hook('response', (res, event) => {
    const details = requestDetails.get(event)
    if (details) {
      res.headers.set('x-request-id', details.requestId)
    }

    let path: string
    try {
      path = new URL(event.req.url).pathname
    } catch {
      path = event.req.url
    }
    if (SILENT_PATHS.has(path)) {
      return
    }
    const latencyMs =
      details === undefined
        ? undefined
        : Math.round(performance.now() - details.startedAt)
    const context = {
      latencyMs,
      method: event.req.method,
      path,
      requestId: details?.requestId,
      status: res.status,
    }

    if (res.status >= 500) {
      logger.error(context, 'request')
    } else if (res.status >= 400) {
      logger.warn(context, 'request')
    } else {
      logger.info(context, 'request')
    }
  })
}

export default plugin
