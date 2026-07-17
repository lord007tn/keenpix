import { prisma } from '@/db'
import type { Prisma } from '@/generated/prisma/client'

export function listProjectCustomDomains(orgId: string, projectId: string) {
  return prisma.customDomain.findMany({
    where: { project: { orgId, id: projectId } },
    orderBy: { createdAt: 'asc' },
  })
}

export function listCustomDomainsForProjectDeletion(
  orgId: string,
  projectId: string,
) {
  return prisma.customDomain.findMany({
    where: { project: { orgId, id: projectId } },
    select: { providerHostnameId: true },
  })
}

export function countOrgCustomDomains(orgId: string) {
  return prisma.customDomain.count({ where: { project: { orgId } } })
}

export function getCustomDomain(orgId: string, projectId: string, id: string) {
  return prisma.customDomain.findFirst({
    where: { id, projectId, project: { orgId } },
  })
}

export async function getProjectIdByCustomHostname(hostname: string) {
  const domain = await prisma.customDomain.findFirst({
    where: {
      hostname,
      dnsStatus: 'verified',
      sslStatus: 'active',
      verifiedAt: { not: null },
    },
    select: { projectId: true },
  })
  return domain?.projectId
}

export function createCustomDomainRecord(input: {
  dnsStatus: string
  hostname: string
  lastError: string | null
  limit: number | null
  orgId: string
  projectId: string
  providerData: Prisma.InputJsonValue
  providerHostnameId: string
  sslStatus: string
  verifiedAt: Date | null
}) {
  const { limit, orgId, ...data } = input
  return prisma.$transaction(async (tx) => {
    // Serialize custom-domain creates per organization so simultaneous requests
    // cannot both observe the last free slot and exceed the paid allowance.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${orgId}))`
    if (limit !== null) {
      const used = await tx.customDomain.count({
        where: { project: { orgId } },
      })
      if (used >= limit) {
        throw new Error('Custom-domain allowance reached.')
      }
    }
    return tx.customDomain.create({
      data: {
        ...data,
        lastCheckedAt: new Date(),
      },
    })
  })
}

export function updateCustomDomainRecord(
  id: string,
  input: {
    dnsStatus: string
    lastError: string | null
    providerData: Prisma.InputJsonValue
    sslStatus: string
    verifiedAt: Date | null
  },
) {
  return prisma.customDomain.update({
    where: { id },
    data: { ...input, lastCheckedAt: new Date() },
  })
}

export function deleteCustomDomainRecord(id: string) {
  return prisma.customDomain.delete({ where: { id } })
}
