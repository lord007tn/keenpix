import { prisma } from '@/db'
import { Prisma } from '@/generated/prisma/client'

// Claim a one-shot billing alert slot for (org, kind, period). Returns true only
// for the FIRST caller — the unique constraint makes a concurrent or retried
// claim lose with P2002 — so the winner (and only the winner) sends the email.
export async function claimBillingAlert(
  orgId: string,
  kind: string,
  periodStart: Date,
): Promise<boolean> {
  try {
    await prisma.billingAlert.create({ data: { orgId, kind, periodStart } })
    return true
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return false
    }
    throw error
  }
}

// Emails of the org members who handle billing (owners + admins).
export async function listBillingRecipients(orgId: string): Promise<string[]> {
  const members = await prisma.member.findMany({
    where: { organizationId: orgId, role: { in: ['owner', 'admin'] } },
    select: { user: { select: { email: true } } },
  })
  return members
    .map((member) => member.user.email)
    .filter((email): email is string => Boolean(email))
}

// Subscriptions the usage-alert sweep evaluates: anything that could be serving
// traffic this period (entitled + dunning grace).
export function listAlertableSubscriptions() {
  return prisma.subscription.findMany({
    where: { status: { in: ['active', 'trialing', 'past_due', 'unpaid'] } },
    select: {
      orgId: true,
      plan: true,
      status: true,
      spendCapCents: true,
      currentPeriodStart: true,
      organization: { select: { name: true } },
    },
  })
}
