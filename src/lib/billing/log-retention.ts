import { prisma } from '@/db'
import { DEFAULT_LOG_RETENTION_DAYS, getPlan } from '@/lib/billing/plans'
import { deleteRequestEventsBefore } from '@/lib/clickhouse/retention'
import { errorContext, logger } from '@/lib/logger/logger'
import { isCloud } from '@/server/deployment'

// Per-plan log retention enforcement (cloud only; self-host keeps everything —
// it's the operator's own disk). Each org's raw request logs are deleted past
// its plan's logRetentionDays, in Postgres AND ClickHouse, so the retention the
// pricing page and privacy policy promise is real. Entitled orgs use their
// plan's window; lapsed/unsubscribed orgs fall back to the default below rather
// than keeping data forever (or losing it the moment a card fails).
const ENTITLED = new Set(['active', 'trialing'])
const DAY_MS = 86_400_000

export interface RetentionResult {
  orgs: number
  prunedRows: number
}

async function orgRetentionDays(): Promise<Map<string, number>> {
  const subs = await prisma.subscription.findMany({
    select: { orgId: true, plan: true, status: true },
  })
  const retention = new Map<string, number>()
  for (const sub of subs) {
    const plan = ENTITLED.has(sub.status) ? getPlan(sub.plan) : null
    retention.set(
      sub.orgId,
      plan?.logRetentionDays ?? DEFAULT_LOG_RETENTION_DAYS,
    )
  }
  // Orgs with logs but no subscription row at all (never subscribed or Free)
  // get the default window too.
  const orgsWithLogs = await prisma.requestLog.findMany({
    distinct: ['orgId'],
    select: { orgId: true },
  })
  for (const row of orgsWithLogs) {
    if (!retention.has(row.orgId)) {
      retention.set(row.orgId, DEFAULT_LOG_RETENTION_DAYS)
    }
  }
  return retention
}

// Idempotent sweep — safe to run repeatedly; deletes are bounded by ts cutoffs.
// Invoked from the hourly cron once per UTC day (see shouldRunRetention).
export async function pruneLogRetention(): Promise<RetentionResult> {
  if (!isCloud()) {
    return { orgs: 0, prunedRows: 0 }
  }
  const retention = await orgRetentionDays()
  let prunedRows = 0
  for (const [orgId, days] of retention) {
    try {
      const cutoff = new Date(Date.now() - days * DAY_MS)
      const deleted = await prisma.requestLog.deleteMany({
        where: { orgId, ts: { lt: cutoff } },
      })
      prunedRows += deleted.count
      await deleteRequestEventsBefore(orgId, cutoff)
    } catch (error) {
      logger.error(
        { ...errorContext(error), orgId },
        'log retention prune failed for org',
      )
    }
  }
  return { orgs: retention.size, prunedRows }
}

// The hourly cron calls in every run; only the 03:00 UTC run actually prunes.
// A missed 03:00 run just defers deletion a day — retention is a ceiling, and
// the sweep is idempotent.
export function shouldRunRetention(now: Date): boolean {
  return now.getUTCHours() === 3
}
