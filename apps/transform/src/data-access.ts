import { prisma } from '@keenpix/database'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

const SERVING = new Set(['active', 'trialing', 'past_due', 'unpaid'])
const TRIAL_BANDWIDTH_BYTES = 20 * 1024 ** 3

export interface TransformProject {
  allowedOrigins: string[]
  autoFormat: boolean
  defaultDpr: number
  defaultFit: string
  defaultQuality: number
  id: string
  maxWidth: number | null
  orgId: string
  requireSignedUrls: boolean
  signedUrlTtlSeconds: number | null
  signingKeyVersion: number
  signingSecret: string | null
  stripMetadata: boolean
  watermarkEnabled: boolean
  watermarkMargin: number
  watermarkOpacity: number
  watermarkPosition: string
  watermarkScale: number
  watermarkUrl: string | null
}

export function getTransformProject(
  id: string,
): Promise<TransformProject | null> {
  return prisma.project.findUnique({
    where: { id },
    select: {
      allowedOrigins: true,
      autoFormat: true,
      defaultDpr: true,
      defaultFit: true,
      defaultQuality: true,
      id: true,
      maxWidth: true,
      orgId: true,
      requireSignedUrls: true,
      signedUrlTtlSeconds: true,
      signingKeyVersion: true,
      signingSecret: true,
      stripMetadata: true,
      watermarkEnabled: true,
      watermarkMargin: true,
      watermarkOpacity: true,
      watermarkPosition: true,
      watermarkScale: true,
      watermarkUrl: true,
    },
  })
}

export async function getProjectIdByCustomHostname(hostname: string) {
  const domain = await prisma.customDomain.findFirst({
    where: {
      dnsStatus: 'verified',
      hostname,
      sslStatus: 'active',
      verifiedAt: { not: null },
    },
    select: { projectId: true },
  })
  return domain?.projectId
}

export async function orgCanServe(orgId: string, cloud: boolean) {
  if (!cloud) {
    return true
  }
  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { subscription: true, suspendedAt: true },
  })
  if (
    organization?.suspendedAt ||
    !organization?.subscription ||
    !SERVING.has(organization.subscription.status)
  ) {
    return false
  }
  if (organization.subscription.status !== 'trialing') {
    return true
  }
  const since =
    organization.subscription.currentPeriodStart ??
    dayjs().utc().startOf('month').toDate()
  const through = dayjs().utc().startOf('hour').toDate()
  const [origin, edge] = await Promise.all([
    prisma.analyticsRollupHourly.aggregate({
      where: { bucketStart: { gte: since, lt: through }, orgId },
      _sum: { bytesOut: true },
    }),
    prisma.projectEdgeRollupHourly.aggregate({
      where: {
        bucketStart: { gte: since, lt: through },
        orgId,
        stage: 'edge',
        status: { gte: 200, lt: 300 },
      },
      _sum: { bytes: true },
    }),
  ])
  return (
    Number(origin._sum.bytesOut ?? 0n) + Number(edge._sum.bytes ?? 0n) <=
    TRIAL_BANDWIDTH_BYTES
  )
}
