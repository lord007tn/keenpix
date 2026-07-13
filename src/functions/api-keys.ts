import { createServerFn } from '@tanstack/react-start'
import {
  createOrgApiKey,
  disableOrgApiKey,
  getOrgApiKeyWorkspace,
  listOrgApiKeyActivitiesPage,
} from '@/actions/api-keys'
import { authMiddleware, requireOrgAdmin } from '@/lib/auth/guards'
import {
  apiKeyActivityPageSchema,
  apiKeyWorkspaceSchema,
  createApiKeySchema,
  disableApiKeySchema,
} from '@/schemas/api-keys'

// Org-scoped internal API keys, managed by the tenant's owners/admins (the JSON
// API is a tenant integration surface, not an operator one). Every fn resolves +
// enforces the caller's active org; keys are stamped with and filtered by it.
export const getOrgApiKeysFn = createServerFn({ method: 'GET' })
  .inputValidator(apiKeyWorkspaceSchema)
  .middleware([authMiddleware])
  .handler(({ context, data }) => {
    const orgId = requireOrgAdmin(context)
    return getOrgApiKeyWorkspace(orgId, data.projectId || undefined)
  })

export const createOrgApiKeyFn = createServerFn({ method: 'POST' })
  .inputValidator(createApiKeySchema)
  .middleware([authMiddleware])
  .handler(({ context, data }) => {
    const orgId = requireOrgAdmin(context)
    return createOrgApiKey({
      orgId,
      userId: context.userId,
      name: data.name,
      projectId: data.projectId || undefined,
    })
  })

export const disableOrgApiKeyFn = createServerFn({ method: 'POST' })
  .inputValidator(disableApiKeySchema)
  .middleware([authMiddleware])
  .handler(({ context, data }) => {
    const orgId = requireOrgAdmin(context)
    return disableOrgApiKey(data.id, orgId)
  })

export const getOrgApiKeyActivitiesFn = createServerFn({ method: 'GET' })
  .inputValidator(apiKeyActivityPageSchema)
  .middleware([authMiddleware])
  .handler(({ context, data }) => {
    const orgId = requireOrgAdmin(context)
    return listOrgApiKeyActivitiesPage(
      orgId,
      data.page,
      data.projectId || undefined,
    )
  })
