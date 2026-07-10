import { createFileRoute } from '@tanstack/react-router'
import { env } from '@/env/server'
import { sendUsageAlerts } from '@/lib/billing/alerts'
import {
  pruneLogRetention,
  shouldRunRetention,
} from '@/lib/billing/log-retention'
import { reportUsage } from '@/lib/billing/usage-reporter'
import { errorContext, logger } from '@/lib/logger/logger'

// Machine-triggered usage-metering job. A scheduler (e.g. Coolify cron) POSTs
// here hourly with `Authorization: Bearer $CRON_SECRET`; it reports each cloud
// org's delivered-bytes delta to Polar's meter, then sweeps usage thresholds
// (80%/100%/cap/trial) for one-shot alert emails. Disabled (404) unless
// CRON_SECRET is configured, and always requires the matching bearer token.
async function handleReportUsage(request: Request): Promise<Response> {
  const secret = env.CRON_SECRET
  if (!secret) {
    return new Response('Not found', { status: 404 })
  }
  const auth = request.headers.get('authorization')?.trim()
  if (auth !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  try {
    const result = await reportUsage()
    // Alerting must never fail the metering job: metering is billing-critical,
    // the emails are advisory.
    let alerts = { checked: 0, sent: 0 }
    try {
      alerts = await sendUsageAlerts()
    } catch (error) {
      logger.error(errorContext(error), 'usage alert sweep failed')
    }
    // Once per UTC day, enforce per-plan log retention (Postgres + ClickHouse).
    let retention = { orgs: 0, prunedRows: 0 }
    if (shouldRunRetention(new Date())) {
      try {
        retention = await pruneLogRetention()
      } catch (error) {
        logger.error(errorContext(error), 'log retention prune failed')
      }
    }
    return Response.json({ ...result, alerts, retention })
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
