import { flushLogger } from '@keenpix/logger'
import type { NitroAppPlugin } from 'nitro/types'
import { closePrewarmQueue } from '@/integrations/bullmq/prewarm'
import { flushRequestLogs } from '@/lib/analytics-buffer/buffer'
import { logger } from '@/lib/logger/logger'
import { beginShutdown, isShuttingDown } from '@/server/shutdown'

// Coolify sends SIGTERM on a rolling deploy. srvx (under Nitro's node preset)
// already drains in-flight HTTP connections on that signal. This marks the app
// un-ready, flushes telemetry, and closes the BullMQ producer connection; durable
// jobs continue in the independent worker process.
async function handleSignal(signal: NodeJS.Signals): Promise<void> {
  if (isShuttingDown()) {
    return
  }
  // Flip the readiness flag first (synchronously) so /api/health starts returning
  // 503 and the orchestrator stops routing new traffic here immediately.
  beginShutdown()
  logger.info({ signal }, 'graceful shutdown started')
  await Promise.all([flushRequestLogs(), closePrewarmQueue()])
  logger.info('graceful shutdown complete')
  await flushLogger()
  // srvx's own SIGTERM handler closes the HTTP server in parallel, so the process
  // usually exits on its own once both settle. This unref'd backstop force-exits if
  // a stuck keep-alive socket would otherwise block the deploy — and covers the
  // case where srvx's handler is a no-op (CI/TEST), which would leave us hanging.
  setTimeout(() => process.exit(0), 2000).unref()
}

const plugin: NitroAppPlugin = (nitroApp) => {
  // The node preset never fires the `close` hook, so drive shutdown off the process
  // signals directly. Only in production — in dev, Vite owns the signal lifecycle.
  // Node invokes signal listeners with the signal name, so `handleSignal` is passed
  // as-is (its `signal` param receives 'SIGTERM' / 'SIGINT').
  if (process.env.NODE_ENV === 'production') {
    process.once('SIGTERM', handleSignal)
    process.once('SIGINT', handleSignal)
  }
  // Presets that DO fire `close` (dev IPC, serverless) still drain cleanly.
  nitroApp.hooks.hook('close', async () => {
    beginShutdown()
    await Promise.all([flushRequestLogs(), closePrewarmQueue()])
    await flushLogger()
  })
}

export default plugin
