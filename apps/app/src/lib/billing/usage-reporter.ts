import { prisma } from '@keenpix/database'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import {
  deliveredBytesSince,
  listTrialingOrgIds,
  listUsageBillingCustomers,
  markUsageReported,
} from '@/data-access/usage'
import { env } from '@/env/server'
import { errorContext, logger } from '@/lib/logger/logger'
import { isCloud } from '@/server/deployment'

dayjs.extend(utc)

// Namespaced Postgres advisory-lock key (classid, objid) for the usage-metering
// job, so at most ONE replica reports a window at a time even if the hourly cron
// fans out or overlaps — otherwise the same window could be metered to Polar
// twice (double-billing). Held for the transaction, auto-released on commit.
const USAGE_LOCK_CLASS = 0x6b_70 // "kp"
const USAGE_LOCK_OBJ = 1 // usage-report

const GB = 1024 ** 3
const MAX_WINDOWS_PER_ORG = 24
const POLAR_TIMEOUT_MS = 15_000
const POLAR_API = {
  sandbox: 'https://sandbox-api.polar.sh',
  production: 'https://api.polar.sh',
}

export interface UsageReportResult {
  failed: number
  ingested: number
  orgs: number
  skipped: boolean
}

interface UsageEvent {
  customer_id: string
  external_id: string
  metadata: Record<string, number | string>
  name: string
}

async function ingestEvent(base: string, event: UsageEvent): Promise<void> {
  const res = await fetch(`${base}/v1/events/ingest`, {
    method: 'POST',
    signal: AbortSignal.timeout(POLAR_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${env.POLAR_TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ events: [event] }),
  })
  if (!res.ok) {
    throw new Error(`Polar usage ingest failed (${res.status})`)
  }
}

// Runs on the GLOBAL prisma client (never the mutex transaction): each org's
// watermark advance auto-commits immediately after that org's successful Polar
// ingest. If every write shared one transaction, a later org's failure (or a
// transaction timeout) would roll back watermarks whose external ingests already
// succeeded — and the next run would meter those windows to Polar a second time.
async function runReport(latestThroughDate: Date): Promise<UsageReportResult> {
  const base = POLAR_API[env.POLAR_SERVER ?? 'sandbox']
  const latestThrough = dayjs.utc(latestThroughDate)
  const customers = await listUsageBillingCustomers()
  // Trial usage is free: skip the Polar ingest but still advance the watermark,
  // so a converted org is billed from conversion — never for its trial window.
  const trialing = new Set(await listTrialingOrgIds())
  let ingested = 0
  let failed = 0
  for (const customer of customers) {
    try {
      if (!customer.lastUsageReportAt) {
        // Provider-linked rows are created with a watermark. A legacy/null row
        // has no safe lower bound, so consume its history without billing rather
        // than risk charging all-time usage on a changing retry window.
        await markUsageReported(customer.orgId, latestThrough.toDate())
        continue
      }
      let since = dayjs.utc(customer.lastUsageReportAt)
      let windows = 0
      while (since.isBefore(latestThrough) && windows < MAX_WINDOWS_PER_ORG) {
        const through = since.startOf('hour').add(1, 'hour')
        if (through.isAfter(latestThrough)) {
          break
        }
        const delivered = await deliveredBytesSince(
          customer.orgId,
          since.toDate(),
          through.toDate(),
        )
        if (delivered.bytes > 0 && !trialing.has(customer.orgId)) {
          await ingestEvent(base, {
            name: 'bandwidth_delivered',
            customer_id: customer.polarCustomerId,
            // Each event covers one immutable UTC-hour window. A successful
            // ingest followed by a failed watermark write retries this exact id
            // and quantity even when the retry runs in a later hour.
            external_id: `keenpix:bandwidth:${customer.orgId}:${since.toISOString()}:${through.toISOString()}`,
            metadata: { gb: delivered.bytes / GB, org_id: customer.orgId },
          })
          ingested += 1
        }
        // Committed per window. Later failures never unwind prior watermarks.
        await markUsageReported(customer.orgId, through.toDate())
        since = through
        windows += 1
      }
    } catch (error) {
      // This org's watermark did not advance, so its window is retried next run
      // exactly once; keep going so one broken customer never stalls the rest.
      failed += 1
      logger.error(
        { ...errorContext(error), orgId: customer.orgId },
        'polar usage ingest failed for org',
      )
    }
  }
  return { failed, ingested, orgs: customers.length, skipped: false }
}

// Single-flight within this process (a manual trigger racing the scheduler) AND
// across processes: the run happens inside a transaction that first grabs a
// Postgres advisory lock, so at most one replica reports a window at a time.
let inFlight: Promise<UsageReportResult> | null = null

// Report each cloud org's total managed-delivery delta (in GB) to Polar's
// `bandwidth_delivered` meter. Safe to run on a schedule: watermarks advance
// per-org only after that org's successful ingest, so a failed or skipped run
// re-reports just the un-advanced windows next time. A no-op in self-host or when
// Polar isn't configured.
export function reportUsage(
  settlementThrough = getUsageSettlementThrough(),
): Promise<UsageReportResult> {
  if (!(isCloud() && env.POLAR_TOKEN)) {
    return Promise.resolve({ failed: 0, ingested: 0, orgs: 0, skipped: true })
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
        // lock is transaction-scoped and auto-released on commit. This
        // transaction is ONLY the mutex — runReport() deliberately uses the
        // global client so per-org watermarks commit as they land (see there).
        const locks = await tx.$queryRaw<{ locked: boolean }[]>`
          SELECT pg_try_advisory_xact_lock(${USAGE_LOCK_CLASS}, ${USAGE_LOCK_OBJ}) AS locked`
        if (!locks[0]?.locked) {
          return { failed: 0, ingested: 0, orgs: 0, skipped: true }
        }
        return runReport(settlementThrough)
      },
      // Generous ceiling: the mutex must outlive the full run (many customers x
      // slow Polar). If it still expires, committed watermarks are unaffected —
      // the next run resumes from them.
      { timeout: 600_000, maxWait: 10_000 },
    )
    .finally(() => {
      inFlight = null
    })
  return inFlight
}

// Leave one complete UTC hour for durable analytics batches and Cloudflare
// Analytics Engine ingestion to settle. Polar event ids are immutable per hour,
// so the billing route uses this exact cutoff for both outbox drain and metering.
export function getUsageSettlementThrough() {
  return dayjs.utc().startOf('hour').subtract(1, 'hour').toDate()
}
