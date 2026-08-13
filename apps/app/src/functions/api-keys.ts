import { createServerFn } from '@tanstack/react-start'
import {
  createOrgApiKey,
  disableOrgApiKey,
  getOrgApiKeyWorkspace,
  listOrgApiKeyActivitiesPage,
} from '@/actions/api-keys'
import { authMiddleware, requireOrgAdmin } from '@/lib/auth/guards'
import { assertHasProductAccess } from '@/lib/billing/quota'
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
  .middleware([authMiddleware])
  .inputValidator(apiKeyWorkspaceSchema)
  .handler(async ({ context, data }) => {
    const orgId = requireOrgAdmin(context)
    await assertHasProductAccess(orgId)
    return getOrgApiKeyWorkspace(orgId, data.projectId || undefined)
  })

export const createOrgApiKeyFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(createApiKeySchema)
  .handler(async ({ context, data }) => {
    const orgId = requireOrgAdmin(context)
    await assertHasProductAccess(orgId)
    return createOrgApiKey({
      orgId,
      userId: context.userId,
      name: data.name,
      projectId: data.projectId || undefined,
    })
  })

export const disableOrgApiKeyFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(disableApiKeySchema)
  .handler(async ({ context, data }) => {
    const orgId = requireOrgAdmin(context)
    await assertHasProductAccess(orgId)
    return disableOrgApiKey(data.id, orgId)
  })

export const getOrgApiKeyActivitiesFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator(apiKeyActivityPageSchema)
  .handler(async ({ context, data }) => {
    const orgId = requireOrgAdmin(context)
    await assertHasProductAccess(orgId)
    return listOrgApiKeyActivitiesPage(
      orgId,
      data.page,
      data.projectId || undefined,
    )
  })
