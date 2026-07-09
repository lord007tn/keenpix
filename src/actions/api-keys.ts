import { getProject, listProjects } from '@/actions/projects'
import { disableInternalApiKey } from '@/data-access/admin/api-keys'
import {
  getApiKeyOrgId,
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
  return auth.api.createApiKey({
    body: {
      configId: INTERNAL_CONFIG,
      name: input.name,
      userId: input.userId,
      permissions: PERMISSIONS,
      metadata: input.projectId
        ? { orgId: input.orgId, projectId: input.projectId }
        : { orgId: input.orgId },
    },
  })
}

export async function disableOrgApiKey(id: string, orgId: string) {
  // Ownership check: only disable a key that belongs to the caller's org.
  const keyOrg = await getApiKeyOrgId(id)
  if (keyOrg !== orgId) {
    throw new Error('API key not found')
  }
  return disableInternalApiKey(id, INTERNAL_CONFIG)
}

export function listOrgApiKeyActivitiesPage(orgId: string, page: number) {
  const safePage = Math.max(1, page)
  return listOrgApiKeyActivities(
    orgId,
    (safePage - 1) * ACTIVITY_PAGE_SIZE,
    ACTIVITY_PAGE_SIZE,
  )
}
