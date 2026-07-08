import { getOrgPlan, orgIsServable } from '@/data-access/subscriptions'
import { prisma } from '@/db'
import { isCloud } from '@/server/deployment'

// Plan-limit enforcement. Self-host has no billing, so every check is a no-op
// (unlimited). Cloud reads the org's active plan; an org with no active
// subscription is blocked from consuming resources (there is no cloud free tier).

const NO_SUBSCRIPTION =
  'An active subscription is required. Choose a plan under Settings → Plan & billing.'

export async function assertCanCreateProject(orgId: string): Promise<void> {
  if (!isCloud()) {
    return
  }
  const plan = await getOrgPlan(orgId)
  if (!plan) {
    throw new Error(NO_SUBSCRIPTION)
  }
  if (plan.maxProjects === null) {
    return
  }
  const count = await prisma.project.count({ where: { orgId } })
  if (count >= plan.maxProjects) {
    throw new Error(
      `Your ${plan.name} plan includes ${plan.maxProjects} projects. Upgrade to add more.`,
    )
  }
}

export async function assertCanAddSeat(orgId: string): Promise<void> {
  if (!isCloud()) {
    return
  }
  const plan = await getOrgPlan(orgId)
  if (!plan) {
    throw new Error(NO_SUBSCRIPTION)
  }
  const count = await prisma.member.count({
    where: { organizationId: orgId },
  })
  if (count >= plan.maxSeats) {
    throw new Error(
      `Your ${plan.name} plan includes ${plan.maxSeats} seats. Upgrade to add more.`,
    )
  }
}

// Whether an org may serve transforms. Cloud requires a subscription in a serving
// state — active/trialing, PLUS the dunning grace (past_due/unpaid) so a failed
// renewal doesn't instantly take a live site dark; `revoked` ends it. No free
// tier, so an unsubscribed org can't serve. Self-host always serves.
export function orgCanServe(orgId: string): Promise<boolean> {
  if (!isCloud()) {
    return Promise.resolve(true)
  }
  return orgIsServable(orgId)
}
