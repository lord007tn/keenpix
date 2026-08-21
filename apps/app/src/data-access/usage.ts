import { prisma } from '@keenpix/database'
import type { Prisma } from '@keenpix/database/client'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

// Accepts the global client or an interactive-transaction client, so the usage
// reporter can run its reads/writes inside the advisory-locked transaction.
type Db = Prisma.TransactionClient

// Start of the current UTC hour. Usage is reported only for COMPLETE hours
// (bucketStart < this), so a partial in-flight hour is never under-counted — it's
// picked up next cycle once complete.
function currentHourStart(now: Date): Date {
  return dayjs.utc(now).startOf('hour').toDate()
}

// Managed delivery for an org over [since, through). `through` defaults to the
// current UTC hour and can be fixed by the billing reporter for retry-safe events.
// Application responses come from the durable request-log rollup; successful
// Cloudflare offloads come from the project-attributed edge rollup. A response
// is counted exactly once: edge hits use stage=edge, while edge misses reach the
// application and are already present in bytesOut. `through` is the exclusive
// upper bound to store as the next billing watermark.
export async function deliveredBytesSince(
  orgId: string,
  since: Date | null,
  through = currentHourStart(new Date()),
  db: Db = prisma,
): Promise<{ bytes: number; through: Date }> {
  const bucketStart = since ? { gte: since, lt: through } : { lt: through }
  const [application, edge] = await Promise.all([
    db.analyticsRollupHourly.aggregate({
      where: { orgId, bucketStart },
      _sum: { bytesOut: true },
    }),
    db.projectEdgeRollupHourly.aggregate({
      where: {
        orgId,
        bucketStart,
        stage: 'edge',
        status: { gte: 200, lt: 300 },
      },
      _sum: { bytes: true },
    }),
  ])
  return {
    bytes:
      Number(application._sum.bytesOut ?? 0n) + Number(edge._sum.bytes ?? 0n),
    through,
  }
}

// Public proof uses the same once-only managed-delivery definition as billing:
// successful application responses plus successful edge offloads. The
// application rollup's cached/optimized columns are incremented only for 2xx
// responses, while edge rows need an explicit status guard.
export async function getPlatformSuccessfulDeliveryCount() {
  const [application, edge] = await Promise.all([
    prisma.analyticsRollupHourly.aggregate({
      _sum: { cachedRequests: true, optimizedRequests: true },
    }),
    prisma.projectEdgeRollupHourly.aggregate({
      where: { stage: 'edge', status: { gte: 200, lt: 300 } },
      _sum: { requests: true },
    }),
  ])
  return (
    (application._sum.cachedRequests ?? 0) +
    (application._sum.optimizedRequests ?? 0) +
    (edge._sum.requests ?? 0)
  )
}

// Period usage for the billing panel: delivered bytes since the period start,
// plus every resource count that a plan limits. Pending, unexpired invitations
// reserve seats so the displayed number matches invitation enforcement.
export async function billingUsageSnapshot(orgId: string, since: Date) {
  const [delivered, projects, seats, pendingSeats, customDomains] =
    await Promise.all([
      deliveredBytesSince(orgId, since),
      prisma.project.count({ where: { orgId } }),
      prisma.member.count({ where: { organizationId: orgId } }),
      prisma.invitation.count({
        where: {
          organizationId: orgId,
          status: 'pending',
          expiresAt: { gt: new Date() },
        },
      }),
      prisma.customDomain.count({ where: { project: { orgId } } }),
    ])
  return {
    bytes: delivered.bytes,
    customDomains,
    pendingSeats,
    projects,
    seats,
  }
}

export function listUsageBillingCustomers(db: Db = prisma) {
  return db.billingCustomer.findMany({
    where: {
      organization: {
        subscription: { is: { polarSubscriptionId: { not: null } } },
      },
    },
    select: { orgId: true, polarCustomerId: true, lastUsageReportAt: true },
  })
}

export async function getOldestPaidUsageReportAt(db: Db = prisma) {
  const customer = await db.billingCustomer.findFirst({
    where: {
      lastUsageReportAt: { not: null },
      organization: {
        subscription: {
          is: {
            polarSubscriptionId: { not: null },
            status: { not: 'trialing' },
          },
        },
      },
    },
    orderBy: { lastUsageReportAt: 'asc' },
    select: { lastUsageReportAt: true },
  })
  return customer?.lastUsageReportAt ?? null
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
