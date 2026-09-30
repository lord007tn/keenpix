import { prisma } from '@keenpix/database'

export function listBlockedOriginRequests(input: {
  orgId: string
  projectId?: string
  since: Date
}) {
  return prisma.analyticsRollupHourly.groupBy({
    by: ['projectId', 'sourceHost'],
    where: {
      orgId: input.orgId,
      projectId: input.projectId,
      bucketStart: { gte: input.since },
      status: 403,
      sourceHost: { not: '' },
    },
    _sum: { requests: true },
    having: { requests: { _sum: { gte: 100 } } },
    orderBy: { _sum: { requests: 'desc' } },
  })
}
