import dayjs from 'dayjs'
import { prisma } from '@/db'

export async function listInternalApiKeys(configId: string) {
  const rows = await prisma.apiKey.findMany({
    where: { configId },
    orderBy: { createdAt: 'desc' },
    take: 100,
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
      metadata: true,
      permissions: true,
    },
  })

  return rows.map((apiKey) => {
    let metadata: unknown = apiKey.metadata
    for (let i = 0; i < 2; i++) {
      if (typeof metadata !== 'string') {
        break
      }
      try {
        metadata = JSON.parse(metadata)
      } catch {
        metadata = null
        break
      }
    }

    let permissions: unknown = apiKey.permissions
    for (let i = 0; i < 2; i++) {
      if (typeof permissions !== 'string') {
        break
      }
      try {
        permissions = JSON.parse(permissions)
      } catch {
        permissions = null
        break
      }
    }

    const projectId =
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? Reflect.get(metadata, 'projectId')
        : null

    return {
      id: apiKey.id,
      name: apiKey.name,
      start: apiKey.start,
      prefix: apiKey.prefix,
      enabled: apiKey.enabled,
      requestCount: apiKey.requestCount,
      lastRequest: apiKey.lastRequest,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
      metadata:
        typeof projectId === 'string' && projectId.trim()
          ? { projectId: projectId.trim() }
          : null,
      permissions:
        permissions &&
        typeof permissions === 'object' &&
        !Array.isArray(permissions)
          ? Object.fromEntries(
              Object.entries(permissions).flatMap(([resource, actions]) =>
                Array.isArray(actions)
                  ? [
                      [
                        resource,
                        actions.filter((action) => typeof action === 'string'),
                      ],
                    ]
                  : [],
              ),
            )
          : null,
    }
  })
}

export interface NewApiKeyActivity {
  apiKeyId: string
  ipAddress?: string
  latencyMs?: number
  method: string
  path: string
  projectId?: string
  scope: 'all_projects' | 'project'
  status: number
  userAgent?: string
}

export async function createApiKeyActivity(input: NewApiKeyActivity) {
  await prisma.apiKeyActivity.create({
    data: {
      apiKeyId: input.apiKeyId,
      method: input.method,
      path: input.path,
      status: input.status,
      projectId: input.projectId ?? null,
      scope: input.scope,
      latencyMs: input.latencyMs ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  })
}

export function countApiKeyActivities(configId: string) {
  return prisma.apiKeyActivity.count({ where: { apiKey: { configId } } })
}

export async function listApiKeyActivities(
  configId: string,
  skip = 0,
  take = 50,
) {
  const rows = await prisma.apiKeyActivity.findMany({
    where: { apiKey: { configId } },
    // id tiebreaker keeps offset pagination stable when timestamps collide.
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
        select: {
          id: true,
          name: true,
          prefix: true,
          start: true,
        },
      },
    },
  })

  return rows.map((activity) => ({
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
  }))
}

export async function disableInternalApiKey(id: string, configId: string) {
  const result = await prisma.apiKey.updateMany({
    where: { id, configId },
    data: { enabled: false },
  })

  if (result.count === 0) {
    throw new Error('API key not found')
  }

  return { ok: true }
}
