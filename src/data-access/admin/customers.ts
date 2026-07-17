import dayjs from 'dayjs'
import { prisma } from '@/db'
import type { Prisma } from '@/generated/prisma/client'
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
        currentPeriodEnd: true,
        overageAllowed: true,
        polarSubscriptionId: true,
        amountCents: true,
        updatedAt: true,
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
}

function numberFromBigInt(value: bigint | number | null | undefined) {
  return Number(value ?? 0)
}

// Provider linkage is the billing-source discriminator. A null Polar id is a
// local complimentary entitlement with zero revenue.
function mapCustomerAccount(org: CustomerOrg, usage: UsageRow | undefined) {
  const requests = usage?._sum.requests ?? 0
  const cachedRequests = usage?._sum.cachedRequests ?? 0
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
      overageAllowed: org.subscription?.overageAllowed ?? false,
      source: subscriptionSource,
      amountCents:
        subscriptionSource === 'polar'
          ? (org.subscription?.amountCents ?? 0)
          : 0,
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
      requests,
      cachedRequests,
      cacheHitRate: requests > 0 ? cachedRequests / requests : 0,
      bandwidthBytes: numberFromBigInt(usage?._sum.bytesOut),
      bytesSaved: numberFromBigInt(usage?._sum.bytesSaved),
      lastTrafficAt: usage?._max.bucketStart?.toISOString() ?? null,
    },
  }
}

export type CustomerAccount = ReturnType<typeof mapCustomerAccount>

export async function listCustomerAccounts() {
  const since = dayjs().subtract(CUSTOMER_USAGE_DAYS, 'day').toDate()
  const [orgs, usageRows] = await Promise.all([
    prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      select: customerOrgArgs.select,
    }),
    prisma.analyticsRollupHourly.groupBy({
      by: ['orgId'],
      where: { bucketStart: { gte: since } },
      _max: { bucketStart: true },
      _sum: {
        requests: true,
        cachedRequests: true,
        bytesOut: true,
        bytesSaved: true,
      },
    }),
  ])
  const usageByOrg = new Map(usageRows.map((row) => [row.orgId, row]))
  return orgs.map((org) => mapCustomerAccount(org, usageByOrg.get(org.id)))
}

// Single-customer variant for the operator detail dashboard.
export async function getCustomerAccount(orgId: string) {
  const since = dayjs().subtract(CUSTOMER_USAGE_DAYS, 'day').toDate()
  const [org, usageRows] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: customerOrgArgs.select,
    }),
    prisma.analyticsRollupHourly.groupBy({
      by: ['orgId'],
      where: { orgId, bucketStart: { gte: since } },
      _max: { bucketStart: true },
      _sum: {
        requests: true,
        cachedRequests: true,
        bytesOut: true,
        bytesSaved: true,
      },
    }),
  ])
  if (!org) {
    return null
  }
  return mapCustomerAccount(org, usageRows[0])
}
