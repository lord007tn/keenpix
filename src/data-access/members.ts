import { prisma } from '@/db'

// The caller's org-level role (owner | admin | member) for a given org, or null
// when they are not a member. Distinct from the platform User.role.
export async function getMemberRole(
  userId: string,
  orgId: string,
): Promise<string | null> {
  const member = await prisma.member.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
    select: { role: true },
  })
  return member?.role ?? null
}
