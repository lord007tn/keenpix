import dayjs from 'dayjs'
import { prisma } from '@/db'

// Org-scoped reads for the tenant API-keys surface. Internal keys carry their
// owning org in metadata.orgId (stamped at creation); we filter to the caller's
// active org so a tenant only ever sees its own keys.
const INTERNAL_CONFIG = 'internal'

function parseJsonish(value: unknown): unknown {
  let current = value
  for (let i = 0; i < 2; i++) {
    if (typeof current !== 'string') {
      break
    }
    try {
      current = JSON.parse(current)
    } catch {
      return null
    }
  }
  return current
}

function metaFields(raw: unknown) {
  const meta = parseJsonish(raw)
  if (!(meta && typeof meta === 'object' && !Array.isArray(meta))) {
    return { orgId: null as string | null, projectId: null as string | null }
  }
  const orgId = Reflect.get(meta, 'orgId')
  const projectId = Reflect.get(meta, 'projectId')
  return {
    orgId: typeof orgId === 'string' && orgId.trim() ? orgId.trim() : null,
    projectId:
      typeof projectId === 'string' && projectId.trim()
        ? projectId.trim()
        : null,
  }
}

export async function listOrgApiKeys(orgId: string) {
  const rows = await prisma.apiKey.findMany({
    where: { configId: INTERNAL_CONFIG },
    orderBy: { createdAt: 'desc' },
    take: 200,
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
    },
  })
  return rows
    .map((apiKey) => ({ apiKey, meta: metaFields(apiKey.metadata) }))
    .filter(({ meta }) => meta.orgId === orgId)
    .map(({ apiKey, meta }) => ({
      id: apiKey.id,
      name: apiKey.name,
      start: apiKey.start,
      prefix: apiKey.prefix,
      enabled: apiKey.enabled,
      requestCount: apiKey.requestCount,
      lastRequest: apiKey.lastRequest,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
      projectId: meta.projectId,
    }))
}

export async function getApiKeyOrgId(id: string) {
  const row = await prisma.apiKey.findUnique({
    where: { id },
    select: { metadata: true },
  })
  return row ? metaFields(row.metadata).orgId : null
}

async function orgApiKeyIds(orgId: string) {
  const rows = await prisma.apiKey.findMany({
    where: { configId: INTERNAL_CONFIG },
    select: { id: true, metadata: true },
  })
  return rows
    .filter((row) => metaFields(row.metadata).orgId === orgId)
    .map((row) => row.id)
}

export async function listOrgApiKeyActivities(
  orgId: string,
  skip = 0,
  take = 10,
) {
  const ids = await orgApiKeyIds(orgId)
  if (ids.length === 0) {
    return { activities: [], total: 0 }
  }
  const where = { apiKeyId: { in: ids } }
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
