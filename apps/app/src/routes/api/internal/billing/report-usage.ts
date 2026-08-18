import { createFileRoute } from '@tanstack/react-router'
import { captureEdgeHistory } from '@/actions/analytics/edge-history'
import { verifyUsageCaptureCoverage } from '@/actions/billing/verify-usage-coverage'
import { env } from '@/env/server'
import { flushDurableRequestLogs } from '@/lib/analytics-buffer/buffer'
import { sendUsageAlerts } from '@/lib/billing/alerts'
import {
  pruneLogRetention,
  shouldRunRetention,
} from '@/lib/billing/log-retention'
import {
  getUsageSettlementThrough,
  reportUsage,
} from '@/lib/billing/usage-reporter'
import { errorContext, logger } from '@/lib/logger/logger'

// Machine-triggered usage-metering job. A scheduler (e.g. Coolify cron) POSTs
// here hourly with `Authorization: Bearer $CRON_SECRET`; it reports each cloud
// org's delivered-bytes delta to Polar's meter, then sweeps usage thresholds
// (80%/100%/cap/trial) for one-shot alert emails. Disabled (404) unless
// CRON_SECRET is configured, and always requires the matching bearer token.
export async function handleReportUsage(request: Request): Promise<Response> {
  const secret = env.CRON_SECRET
  if (!secret) {
    return new Response('Not found', { status: 404 })
  }
  const auth = request.headers.get('authorization')?.trim()
  if (auth !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  try {
    // Edge delivery is part of the billable meter. Capture it before reading the
    // complete-hour rollups; if capture fails, do not advance billing
    // watermarks with an incomplete total. The next run safely retries.
    const edgeHistory = await captureEdgeHistory()
    if (!edgeHistory.configured) {
      throw new Error(
        'Cloudflare edge capture is required before managed usage metering.',
      )
    }
    const settlementThrough = getUsageSettlementThrough()
    if (!edgeHistory.projectCoverage) {
      throw new Error('Cloudflare project-edge coverage is unavailable.')
    }
    await verifyUsageCaptureCoverage({
      ...edgeHistory.projectCoverage,
      through: settlementThrough,
    })
    await flushDurableRequestLogs({
      requireComplete: true,
      through: settlementThrough,
    })
    const result = await reportUsage(settlementThrough)
    // Alerting must never fail the metering job: metering is billing-critical,
    // the emails are advisory.
    const alertsPromise = sendUsageAlerts().catch((error) => {
      logger.error(errorContext(error), 'usage alert sweep failed')
      return { checked: 0, sent: 0 }
    })
    // Once per UTC day, enforce per-plan log retention (Postgres + ClickHouse).
    const retentionPromise = shouldRunRetention(new Date())
      ? pruneLogRetention().catch((error) => {
          logger.error(errorContext(error), 'log retention prune failed')
          return { orgs: 0, prunedRows: 0 }
        })
      : Promise.resolve({ orgs: 0, prunedRows: 0 })
    const [alerts, retention] = await Promise.all([
      alertsPromise,
      retentionPromise,
    ])
    return Response.json(
      { ...result, alerts, edgeHistory, retention },
      { status: result.failed > 0 ? 502 : 200 },
    )
  } catch (error) {
    logger.error(errorContext(error), 'usage report job failed')
    return new Response('Usage report failed', { status: 500 })
  }
}

export const Route = createFileRoute('/api/internal/billing/report-usage')({
  server: {
    handlers: {
      POST: ({ request }: { request: Request }) => handleReportUsage(request),
    },
  },
})
