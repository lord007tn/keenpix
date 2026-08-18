import { prisma } from '@keenpix/database'

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

export function getLatestMembership(userId: string) {
  return prisma.member.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { organizationId: true, role: true },
  })
}

export async function setSessionActiveOrganization(
  sessionId: string,
  organizationId: string,
) {
  await prisma.session.update({
    where: { id: sessionId },
    data: { activeOrganizationId: organizationId },
  })
}

export function ensurePersonalOrganizationMembership(input: {
  email: string
  name?: string | null
  userId: string
}) {
  return prisma.$transaction(async (tx) => {
    // Parallel app loaders and OAuth callbacks can all reach this recovery path.
    // Serialize by user so they can never receive duplicate personal workspaces.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.userId}))`
    const existing = await tx.member.findFirst({
      where: { userId: input.userId },
      orderBy: { createdAt: 'desc' },
      select: { organizationId: true, role: true },
    })
    if (existing) {
      return existing
    }
    const base =
      input.email
        .split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 24) || 'org'
    const organization = await tx.organization.create({
      data: {
        name: input.name?.trim() || input.email.split('@')[0],
        slug: `${base}-${crypto.randomUUID().slice(0, 8)}`,
      },
    })
    return tx.member.create({
      data: {
        organizationId: organization.id,
        userId: input.userId,
        role: 'owner',
      },
      select: { organizationId: true, role: true },
    })
  })
}
