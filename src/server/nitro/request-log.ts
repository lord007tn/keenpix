import type { NitroAppPlugin } from 'nitro/types'
import { logger } from '@/lib/logger/logger'

// The orchestrator hits /api/health every ~10s; logging it would bury real traffic
// under health-check noise, so it's dropped from the access log.
const SILENT_PATHS = new Set(['/api/health'])

// Correlate request-start → response by the event's identity. A WeakMap keeps this
// leak-free: the entry disappears when the event is garbage-collected, so a dropped
// connection (no `response` hook) can't accumulate.
const startedAt = new WeakMap<object, number>()

// Structured access log for every dynamic request: method, path, status, latency.
// Nitro's `request`/`response` hooks wrap the h3 app, so this covers the transform
// endpoint, the SDK API, and SSR routes — giving prod a single stdout stream to
// watch for error rates and slow requests.
const plugin: NitroAppPlugin = (nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    startedAt.set(event, performance.now())
  })
  nitroApp.hooks.hook('response', (res, event) => {
    let path: string
    try {
      path = new URL(event.req.url).pathname
    } catch {
      path = event.req.url
    }
    if (SILENT_PATHS.has(path)) {
      return
    }
    const start = startedAt.get(event)
    const latencyMs =
      start === undefined ? undefined : Math.round(performance.now() - start)
    logger.info(
      { method: event.req.method, path, status: res.status, latencyMs },
      'request',
    )
  })
}

export default plugin
