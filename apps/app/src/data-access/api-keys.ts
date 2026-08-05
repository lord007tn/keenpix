import { prisma } from '@keenpix/database'
import dayjs from 'dayjs'

// Org-scoped reads for the tenant API-keys surface. ApiKeyScope is the
// authoritative relational tenant boundary; metadata is retained only for
// Better Auth compatibility and is never trusted for authorization.
const INTERNAL_CONFIG = 'internal'

export async function listOrgApiKeys(orgId: string, projectId?: string) {
  const rows = await prisma.apiKey.findMany({
    where: {
      configId: INTERNAL_CONFIG,
      scope: { is: { orgId, ...(projectId ? { projectId } : {}) } },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      start: true,
      prefix: true,
      enabled: true,
      requestCount: true,
      lastRequest: true,
      expiresAt: true,
      createdAt: true,
      scope: { select: { projectId: true } },
    },
  })
  return rows.map((apiKey) => ({
    id: apiKey.id,
    name: apiKey.name,
    start: apiKey.start,
    prefix: apiKey.prefix,
    enabled: apiKey.enabled,
    requestCount: apiKey.requestCount,
    lastRequest: apiKey.lastRequest,
    expiresAt: apiKey.expiresAt,
    createdAt: apiKey.createdAt,
    projectId: apiKey.scope?.projectId ?? null,
  }))
}

export function createApiKeyScope(input: {
  apiKeyId: string
  orgId: string
  projectId?: string
}) {
  return prisma.apiKeyScope.create({
    data: {
      apiKeyId: input.apiKeyId,
      orgId: input.orgId,
      projectId: input.projectId,
    },
  })
}

export function getApiKeyScope(apiKeyId: string) {
  return prisma.apiKeyScope.findUnique({
    where: { apiKeyId },
    select: { orgId: true, projectId: true },
  })
}

export async function disableOrgApiKey(id: string, orgId: string) {
  const result = await prisma.apiKey.updateMany({
    where: {
      id,
      configId: INTERNAL_CONFIG,
      scope: { is: { orgId } },
    },
    data: { enabled: false },
  })
  if (result.count === 0) {
    throw new Error('API key not found')
  }
  return { ok: true }
}

export async function listOrgApiKeyActivities(
  orgId: string,
  skip = 0,
  take = 10,
  projectId?: string,
) {
  const where = {
    apiKey: {
      scope: { is: { orgId, ...(projectId ? { projectId } : {}) } },
    },
  }
  const [rows, total] = await Promise.all([
    prisma.apiKeyActivity.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take,
      select: {
        id: true,
        method: true,
        path: true,
        status: true,
        projectId: true,
        scope: true,
        latencyMs: true,
        createdAt: true,
        apiKey: {
          select: { id: true, name: true, prefix: true, start: true },
        },
      },
    }),
    prisma.apiKeyActivity.count({ where }),
  ])
  return {
    activities: rows.map((activity) => ({
      id: activity.id,
      method: activity.method,
      path: activity.path,
      status: activity.status,
      projectId: activity.projectId,
      scope:
        activity.scope === 'project' || activity.scope === 'all_projects'
          ? activity.scope
          : 'all_projects',
      latencyMs: activity.latencyMs,
      createdAt: dayjs(activity.createdAt).toISOString(),
      apiKey: {
        id: activity.apiKey.id,
        name: activity.apiKey.name,
        prefix: activity.apiKey.prefix,
        start: activity.apiKey.start,
      },
    })),
    total,
  }
}
