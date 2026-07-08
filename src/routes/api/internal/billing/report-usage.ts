import { createFileRoute } from '@tanstack/react-router'
import { env } from '@/env/server'
import { reportUsage } from '@/lib/billing/usage-reporter'
import { errorContext, logger } from '@/lib/logger/logger'

// Machine-triggered usage-metering job. A scheduler (e.g. Coolify cron) POSTs
// here hourly with `Authorization: Bearer $CRON_SECRET`; it reports each cloud
// org's delivered-bytes delta to Polar's meter. Disabled (404) unless CRON_SECRET
// is configured, and always requires the matching bearer token.
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
    return Response.json(result)
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
