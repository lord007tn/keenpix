import { prisma } from '@/db'
import type { Prisma } from '@/generated/prisma/client'

// Accepts the global client or an interactive-transaction client, so the usage
// reporter can run its reads/writes inside the advisory-locked transaction.
type Db = Prisma.TransactionClient

// Start of the current UTC hour. Usage is reported only for COMPLETE hours
// (bucketStart < this), so a partial in-flight hour is never under-counted — it's
// picked up next cycle once complete.
function currentHourStart(now: Date): Date {
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
    ),
  )
}

// Delivered bytes for an org over the complete hours in [since, currentHour),
// read from the hourly rollups — always populated (written in the request-log
// transaction), per-org, so billing never depends on the optional ClickHouse
// tier. `through` is the exclusive upper bound to store as the next watermark.
export async function deliveredBytesSince(
  orgId: string,
  since: Date | null,
  db: Db = prisma,
): Promise<{ bytes: number; through: Date }> {
  const through = currentHourStart(new Date())
  const agg = await db.analyticsRollupHourly.aggregate({
    where: {
      orgId,
      bucketStart: since ? { gte: since, lt: through } : { lt: through },
    },
    _sum: { bytesOut: true },
  })
  return { bytes: Number(agg._sum.bytesOut ?? 0n), through }
}

// Period usage for the billing panel: delivered bytes since the period start,
// plus the resource counts that plan limits apply to (projects, seats). One
// round-trip so the billing UI can show a full usage picture.
export async function billingUsageSnapshot(orgId: string, since: Date) {
  const [delivered, projects, seats] = await Promise.all([
    deliveredBytesSince(orgId, since),
    prisma.project.count({ where: { orgId } }),
    prisma.member.count({ where: { organizationId: orgId } }),
  ])
  return { bytes: delivered.bytes, projects, seats }
}

export function listUsageBillingCustomers(db: Db = prisma) {
  return db.billingCustomer.findMany({
    select: { orgId: true, polarCustomerId: true, lastUsageReportAt: true },
  })
}

// Orgs currently in a free trial. The usage reporter skips ingesting their
// delivered bytes (trial usage is never billed) while still advancing their
// watermark, so billing starts exactly at trial conversion.
export async function listTrialingOrgIds(db: Db = prisma) {
  const rows = await db.subscription.findMany({
    where: { status: 'trialing' },
    select: { orgId: true },
  })
  return rows.map((row) => row.orgId)
}

export function markUsageReported(orgId: string, at: Date, db: Db = prisma) {
  return db.billingCustomer.update({
    where: { orgId },
    data: { lastUsageReportAt: at },
  })
}
