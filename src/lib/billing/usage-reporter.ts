import {
  deliveredBytesSince,
  listUsageBillingCustomers,
  markUsageReported,
} from '@/data-access/usage'
import { env } from '@/env/server'
import { errorContext, logger } from '@/lib/logger/logger'
import { isCloud } from '@/server/deployment'

const GB = 1024 ** 3
const POLAR_API = {
  sandbox: 'https://sandbox-api.polar.sh',
  production: 'https://api.polar.sh',
}

export interface UsageReportResult {
  ingested: number
  orgs: number
  skipped: boolean
}

interface UsageEvent {
  customer_id: string
  metadata: Record<string, number | string>
  name: string
}

async function ingestEvent(base: string, event: UsageEvent): Promise<void> {
  const res = await fetch(`${base}/v1/events/ingest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.POLAR_TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ events: [event] }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(
      `Polar usage ingest failed: ${res.status} ${detail.slice(0, 300)}`,
    )
  }
}

async function runReport(): Promise<UsageReportResult> {
  const base = POLAR_API[env.POLAR_SERVER ?? 'sandbox']
  const customers = await listUsageBillingCustomers()
  let ingested = 0
  // Per-org: report THIS org's delta, then advance ONLY its watermark. So a later
  // org's failure never re-reports an org already ingested this run (the old
  // batch-then-mark-all path re-ingested the whole window if a single mark threw).
  for (const customer of customers) {
    const { bytes, through } = await deliveredBytesSince(
      customer.orgId,
      customer.lastUsageReportAt,
    )
    if (bytes > 0) {
      try {
        await ingestEvent(base, {
          name: 'bandwidth_delivered',
          customer_id: customer.polarCustomerId,
          metadata: { gb: bytes / GB, org_id: customer.orgId },
        })
      } catch (error) {
        // Stop before advancing this org's watermark so its window is retried
        // next run; orgs already ingested+marked above stay reported exactly once.
        logger.error(errorContext(error), 'polar usage ingest failed')
        throw error
      }
      ingested += 1
    }
    await markUsageReported(customer.orgId, through)
  }
  return { ingested, orgs: customers.length, skipped: false }
}

// Single-flight within this process: if a run is already in progress (e.g. a
// manual trigger racing the scheduler), return the in-flight run instead of
// starting a second one that would read the same watermarks and double-count.
// NOTE: this guard is per-process — a horizontally-scaled cloud should also put a
// distributed lock (or a single-runner schedule) in front of the endpoint.
let inFlight: Promise<UsageReportResult> | null = null

// Report each cloud org's delivered-bytes delta (in GB) to Polar's
// `bandwidth_delivered` meter. Safe to run on a schedule: watermarks advance
// per-org only after that org's successful ingest, so a failed run re-reports
// just the un-advanced windows next time. A no-op in self-host or when Polar
// isn't configured.
export function reportUsage(): Promise<UsageReportResult> {
  if (!(isCloud() && env.POLAR_TOKEN)) {
    return Promise.resolve({ ingested: 0, orgs: 0, skipped: true })
  }
  if (inFlight) {
    return inFlight
  }
  inFlight = runReport().finally(() => {
    inFlight = null
  })
  return inFlight
}
