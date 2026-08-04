import dayjs from 'dayjs'
import { prisma } from '@/db'
import type { Prisma } from '@/generated/prisma/client'
import { CUSTOM_DOMAIN_ADDON } from '@/lib/billing/addons'
import { getPlan } from '@/lib/billing/plans'

// Operator kill-switch write: set suspendedAt/reason (suspend) or clear (both null
// to reactivate). Enforced by the serving gate via isOrgSuspended.
export function setOrgSuspension(
  orgId: string,
  suspendedAt: Date | null,
  suspendedReason: string | null,
) {
  return prisma.organization.update({
    where: { id: orgId },
    data: { suspendedAt, suspendedReason },
  })
}

const CUSTOMER_USAGE_DAYS = 30
const ENTITLED_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])

const customerOrgArgs = {
  select: {
    id: true,
    name: true,
    slug: true,
    createdAt: true,
    suspendedAt: true,
    suspendedReason: true,
    members: {
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        role: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        },
      },
    },
    subscription: {
      select: {
        cancelAtPeriodEnd: true,
        plan: true,
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        overageAllowed: true,
        polarSubscriptionId: true,
        amountCents: true,
        becamePayingAt: true,
        overagePerGbCents: true,
        updatedAt: true,
      },
    },
    subscriptionAddons: {
      select: {
        kind: true,
        status: true,
      },
    },
    _count: { select: { members: true, projects: true } },
  },
} satisfies Prisma.OrganizationDefaultArgs

type CustomerOrg = Prisma.OrganizationGetPayload<typeof customerOrgArgs>
interface UsageRow {
  _max: { bucketStart: Date | null }
  _sum: {
    requests: number | null
    cachedRequests: number | null
    bytesOut: bigint | null
    bytesSaved: bigint | null
  }
  orgId: string
  status: number
}

interface EdgeUsageRow {
  _max: { bucketStart: Date | null }
  _sum: { bytes: bigint | null; requests: number | null }
  orgId: string
  stage: string
}

function numberFromBigInt(value: bigint | number | null | undefined) {
  return Number(value ?? 0)
}

// Provider linkage is the billing-source discriminator. A null Polar id is a
// local complimentary entitlement with zero revenue.
function mapCustomerAccount(
  org: CustomerOrg,
  usageRows: UsageRow[],
  edgeRows: EdgeUsageRow[],
) {
  const firstTrafficAt = usageRows[0]?._max.bucketStart ?? null
  const usage = usageRows.reduce(
    (total, row) => {
      const requests = row._sum.requests ?? 0
      total.attemptedRequests += requests
      total.totalBandwidthBytes += numberFromBigInt(row._sum.bytesOut)
      if (row.status >= 200 && row.status < 300) {
        total.requests += requests
        total.cachedRequests += row._sum.cachedRequests ?? 0
        total.bandwidthBytes += numberFromBigInt(row._sum.bytesOut)
        total.bytesSaved += numberFromBigInt(row._sum.bytesSaved)
      }
      if (
        row._max.bucketStart &&
        (!total.lastTrafficAt || row._max.bucketStart > total.lastTrafficAt)
      ) {
        total.lastTrafficAt = row._max.bucketStart
      }
      return total
    },
    {
      attemptedRequests: 0,
      requests: 0,
      cachedRequests: 0,
      bandwidthBytes: 0,
      totalBandwidthBytes: 0,
      bytesSaved: 0,
      lastTrafficAt: firstTrafficAt,
    },
  )
  const edge = edgeRows.reduce(
    (total, row) => {
      // Only Worker-classified Edge responses are additive. Cache, optimized,
      // and failed requests reached the origin and already exist in its rollup.
      if (row.stage === 'edge') {
        total.requests += row._sum.requests ?? 0
        total.bandwidthBytes += numberFromBigInt(row._sum.bytes)
      }
      if (
        row._max.bucketStart &&
        (!total.lastTrafficAt || row._max.bucketStart > total.lastTrafficAt)
      ) {
        total.lastTrafficAt = row._max.bucketStart
      }
      return total
    },
    {
      requests: 0,
      bandwidthBytes: 0,
      lastTrafficAt: edgeRows[0]?._max.bucketStart ?? null,
    },
  )
  const subscriptionPlan = getPlan(org.subscription?.plan)
  const subscriptionActive = org.subscription
    ? ENTITLED_SUBSCRIPTION_STATUSES.has(org.subscription.status)
    : false
  const effectivePlan = subscriptionActive ? subscriptionPlan : null
  let subscriptionSource: 'admin_grant' | 'free' | 'polar' = 'free'
  if (org.subscription) {
    subscriptionSource = org.subscription.polarSubscriptionId
      ? 'polar'
      : 'admin_grant'
  }
  const entitledAddons = org.subscriptionAddons.filter(
    (addon) =>
      addon.kind === CUSTOM_DOMAIN_ADDON.kind &&
      ENTITLED_SUBSCRIPTION_STATUSES.has(addon.status),
  )
  const addonAmountCents =
    entitledAddons.length * CUSTOM_DOMAIN_ADDON.priceMonthlyUsd * 100
  const primaryMrrCents =
    subscriptionSource === 'polar' && subscriptionActive
      ? (org.subscription?.amountCents ?? 0)
      : 0

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    createdAt: dayjs(org.createdAt).toISOString(),
    suspendedAt: org.suspendedAt?.toISOString() ?? null,
    suspendedReason: org.suspendedReason,
    projects: org._count.projects,
    seats: org._count.members,
    owners: org.members
      .filter((member) => member.role === 'owner')
      .map((member) => ({
        id: member.user.id,
        email: member.user.email,
        name: member.user.name,
        platformRole: member.user.role,
      })),
    members: org.members.map((member) => ({
      id: member.user.id,
      email: member.user.email,
      name: member.user.name,
      orgRole: member.role,
      platformRole: member.user.role,
      createdAt: dayjs(member.user.createdAt).toISOString(),
    })),
    billing: {
      cancelAtPeriodEnd: org.subscription?.cancelAtPeriodEnd ?? false,
      plan: subscriptionPlan?.id ?? null,
      planName: subscriptionPlan?.name ?? null,
      status: org.subscription?.status ?? null,
      currentPeriodEnd:
        org.subscription?.currentPeriodEnd?.toISOString() ?? null,
      currentPeriodStart:
        org.subscription?.currentPeriodStart?.toISOString() ?? null,
      overageAllowed: org.subscription?.overageAllowed ?? false,
      source: subscriptionSource,
      amountCents:
        subscriptionSource === 'polar'
          ? (org.subscription?.amountCents ?? 0)
          : 0,
      becamePayingAt: org.subscription?.becamePayingAt?.toISOString() ?? null,
      overagePerGbCents:
        subscriptionSource === 'polar'
          ? (org.subscription?.overagePerGbCents ?? 0)
          : 0,
      addonAmountCents,
      mrrCents: primaryMrrCents + addonAmountCents,
      recurringChargeCount:
        (primaryMrrCents > 0 ? 1 : 0) + entitledAddons.length,
      updatedAt: org.subscription?.updatedAt.toISOString() ?? null,
    },
    effectivePlan: effectivePlan
      ? {
          historyDays: effectivePlan.historyDays,
          plan: effectivePlan.id,
          planName: effectivePlan.name,
          source: subscriptionSource,
        }
      : null,
    usage30d: {
      attemptedRequests: usage.attemptedRequests + edge.requests,
      requests: usage.requests + edge.requests,
      cachedRequests: usage.cachedRequests + edge.requests,
      cacheHitRate:
        usage.requests + edge.requests > 0
          ? (usage.cachedRequests + edge.requests) /
            (usage.requests + edge.requests)
          : 0,
      bandwidthBytes: usage.bandwidthBytes + edge.bandwidthBytes,
      totalBandwidthBytes: usage.totalBandwidthBytes + edge.bandwidthBytes,
      bytesSaved: usage.bytesSaved,
      edgeRequests: edge.requests,
      edgeBandwidthBytes: edge.bandwidthBytes,
      originAttemptedRequests: usage.attemptedRequests,
      originRequests: usage.requests,
      originBandwidthBytes: usage.bandwidthBytes,
      lastTrafficAt:
        [usage.lastTrafficAt, edge.lastTrafficAt]
          .filter((value) => value !== null)
          .sort((a, b) => b.getTime() - a.getTime())[0]
          ?.toISOString() ?? null,
    },
  }
}

export type CustomerAccount = ReturnType<typeof mapCustomerAccount>

export async function listCustomerAccounts() {
  const since = dayjs().subtract(CUSTOMER_USAGE_DAYS, 'day').toDate()
  const [orgs, usageRows, edgeRows] = await Promise.all([
    prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      select: customerOrgArgs.select,
    }),
    prisma.analyticsRollupHourly.groupBy({
      by: ['orgId', 'status'],
      where: { bucketStart: { gte: since } },
      _max: { bucketStart: true },
      _sum: {
        requests: true,
        cachedRequests: true,
        bytesOut: true,
        bytesSaved: true,
      },
    }),
    prisma.projectEdgeRollupHourly.groupBy({
      by: ['orgId', 'stage'],
      where: { bucketStart: { gte: since } },
      _max: { bucketStart: true },
      _sum: { requests: true, bytes: true },
    }),
  ])
  const usageByOrg = new Map<string, UsageRow[]>()
  for (const row of usageRows) {
    const rows = usageByOrg.get(row.orgId) ?? []
    rows.push(row)
    usageByOrg.set(row.orgId, rows)
  }
  const edgeByOrg = new Map<string, EdgeUsageRow[]>()
  for (const row of edgeRows) {
    const rows = edgeByOrg.get(row.orgId) ?? []
    rows.push(row)
    edgeByOrg.set(row.orgId, rows)
  }
  return orgs.map((org) =>
    mapCustomerAccount(
      org,
      usageByOrg.get(org.id) ?? [],
      edgeByOrg.get(org.id) ?? [],
    ),
  )
}
