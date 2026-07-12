import { getProject, listProjects } from '@/actions/projects'
import {
  createApiKeyScope,
  disableOrgApiKey as disableOrgApiKeyInDb,
  getApiKeyScope,
  listOrgApiKeyActivities,
  listOrgApiKeys,
} from '@/data-access/api-keys'
import { auth } from '@/lib/auth/server'
import { ACTIVITY_PAGE_SIZE } from '@/schemas/admin'

const INTERNAL_CONFIG = 'internal'
const PERMISSIONS = { projects: ['read', 'write'] }

export async function getOrgApiKeyWorkspace(orgId: string) {
  const [apiKeys, projects, activityPage] = await Promise.all([
    listOrgApiKeys(orgId),
    listProjects(orgId),
    listOrgApiKeyActivities(orgId, 0, ACTIVITY_PAGE_SIZE),
  ])
  return {
    apiKeys,
    projects,
    apiKeyActivities: activityPage.activities,
    apiKeyActivitiesTotal: activityPage.total,
  }
}

export async function createOrgApiKey(input: {
  orgId: string
  userId: string
  name: string
  projectId?: string
}) {
  // A project-scoped key must reference a project in the caller's own org.
  if (input.projectId) {
    const project = await getProject(input.orgId, input.projectId)
    if (!project) {
      throw new Error('Project not found in this organization')
    }
  }
  const created = await auth.api.createApiKey({
    body: {
      configId: INTERNAL_CONFIG,
      name: input.name,
      userId: input.userId,
      organizationId: input.orgId,
      permissions: PERMISSIONS,
      metadata: input.projectId
        ? { orgId: input.orgId, projectId: input.projectId }
        : { orgId: input.orgId },
    },
  })
  try {
    await createApiKeyScope({
      apiKeyId: created.id,
      orgId: input.orgId,
      projectId: input.projectId,
    })
  } catch (error) {
    // Never return a key without its relational authorization scope. Disabling
    // the orphan makes a partial failure fail closed even before cleanup.
    await auth.api
      .updateApiKey({
        body: { keyId: created.id, enabled: false, userId: input.userId },
      })
      .catch(() => undefined)
    throw error
  }
  return created
}

export function disableOrgApiKey(id: string, orgId: string) {
  return disableOrgApiKeyInDb(id, orgId)
}

export function getOrgApiKeyAccess(apiKeyId: string) {
  return getApiKeyScope(apiKeyId)
}

export function listOrgApiKeyActivitiesPage(orgId: string, page: number) {
  const safePage = Math.max(1, page)
  return listOrgApiKeyActivities(
    orgId,
    (safePage - 1) * ACTIVITY_PAGE_SIZE,
    ACTIVITY_PAGE_SIZE,
  )
}
