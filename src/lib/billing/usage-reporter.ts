import {
  deliveredBytesSince,
  listUsageBillingCustomers,
  markUsageReported,
} from '@/data-access/usage'
import { prisma } from '@/db'
import { env } from '@/env/server'
import type { Prisma } from '@/generated/prisma/client'
import { errorContext, logger } from '@/lib/logger/logger'
import { isCloud } from '@/server/deployment'

// Namespaced Postgres advisory-lock key (classid, objid) for the usage-metering
// job, so at most ONE replica reports a window at a time even if the hourly cron
// fans out or overlaps — otherwise the same window could be metered to Polar
// twice (double-billing). Held for the transaction, auto-released on commit.
const USAGE_LOCK_CLASS = 0x6b_70 // "kp"
const USAGE_LOCK_OBJ = 1 // usage-report

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

async function runReport(
  db: Prisma.TransactionClient,
): Promise<UsageReportResult> {
  const base = POLAR_API[env.POLAR_SERVER ?? 'sandbox']
  const customers = await listUsageBillingCustomers(db)
  let ingested = 0
  // Per-org: report THIS org's delta, then advance ONLY its watermark. So a later
  // org's failure never re-reports an org already ingested this run (the old
  // batch-then-mark-all path re-ingested the whole window if a single mark threw).
  for (const customer of customers) {
    const { bytes, through } = await deliveredBytesSince(
      customer.orgId,
      customer.lastUsageReportAt,
      db,
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
    await markUsageReported(customer.orgId, through, db)
  }
  return { ingested, orgs: customers.length, skipped: false }
}

// Single-flight within this process (a manual trigger racing the scheduler) AND
// across processes: the run happens inside a transaction that first grabs a
// Postgres advisory lock, so at most one replica reports a window at a time.
let inFlight: Promise<UsageReportResult> | null = null

// Report each cloud org's delivered-bytes delta (in GB) to Polar's
// `bandwidth_delivered` meter. Safe to run on a schedule: watermarks advance
// per-org only after that org's successful ingest, so a failed or skipped run
// re-reports just the un-advanced windows next time. A no-op in self-host or when
// Polar isn't configured.
export function reportUsage(): Promise<UsageReportResult> {
  if (!(isCloud() && env.POLAR_TOKEN)) {
    return Promise.resolve({ ingested: 0, orgs: 0, skipped: true })
  }
  if (inFlight) {
    return inFlight
  }
  inFlight = prisma
    .$transaction(
      async (tx) => {
        // Only the replica that wins the advisory lock runs; any other concurrent
        // run no-ops (its window is picked up next cycle from the watermarks), so
        // a fanned-out or overlapping cron can never double-meter to Polar. The
        // lock is transaction-scoped and auto-released on commit.
        const locks = await tx.$queryRaw<{ locked: boolean }[]>`
          SELECT pg_try_advisory_xact_lock(${USAGE_LOCK_CLASS}, ${USAGE_LOCK_OBJ}) AS locked`
        if (!locks[0]?.locked) {
          return { ingested: 0, orgs: 0, skipped: true }
        }
        return runReport(tx)
      },
      { timeout: 120_000, maxWait: 10_000 },
    )
    .finally(() => {
      inFlight = null
    })
  return inFlight
}
