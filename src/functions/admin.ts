import { createServerFn } from '@tanstack/react-start'
import {
  createApiKey,
  disableApiKey,
  listApiKeyActivitiesPage,
} from '@/actions/admin/api-keys'
import {
  getClientAccounts,
  setOrgSuspension,
  updateClientInternalPlan,
} from '@/actions/admin/clients'
import {
  testCloudflareConnection,
  updateCloudflareSettings,
} from '@/actions/admin/cloudflare'
import {
  acceptInvitation,
  createInvitation,
  getInvitation,
  revokeInvitation,
} from '@/actions/admin/invitations'
import {
  getOperationsConfig,
  getOperationsHealth,
  getResourceTrend,
  runCacheMaintenance,
  updateOperationsConfig,
} from '@/actions/admin/operations'
import { getAdminWorkspace } from '@/actions/admin/workspace'
import {
  authMiddleware,
  requireSelfHost,
  requireSuperAdmin,
} from '@/lib/auth/guards'
import { bustServingEntitlement } from '@/lib/billing/service-gate'
import {
  acceptInvitationSchema,
  apiActivityPageSchema,
  cacheMaintenanceSchema,
  cloudflareSettingsSchema,
  createInvitationSchema,
  invitationTokenSchema,
  operationsConfigSchema,
  resourceTrendSchema,
  revokeInvitationSchema,
  suspendOrgSchema,
  updateInternalPlanGrantSchema,
} from '@/schemas/admin'
import { createApiKeySchema, disableApiKeySchema } from '@/schemas/api-keys'

export const getAdminWorkspaceFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(({ context }) => {
    requireSuperAdmin(context)
    return getAdminWorkspace()
  })

export const getClientAccountsFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(({ context }) => {
    requireSuperAdmin(context)
    return getClientAccounts()
  })

export const updateInternalPlanGrantFn = createServerFn({ method: 'POST' })
  .inputValidator(updateInternalPlanGrantSchema)
  .middleware([authMiddleware])
  .handler(({ context, data }) => {
    requireSuperAdmin(context)
    return updateClientInternalPlan({
      orgId: data.orgId,
      plan: data.plan,
      reason: data.reason,
      expiresAt: data.expiresAt,
      grantedById: context.userId,
    })
  })

export const setOrgSuspensionFn = createServerFn({ method: 'POST' })
  .inputValidator(suspendOrgSchema)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    requireSuperAdmin(context)
    const result = await setOrgSuspension({
      orgId: data.orgId,
      suspended: data.suspended,
      reason: data.reason,
    })
    // Kill-switch takes effect on the next request, not after the gate's TTL.
    bustServingEntitlement(data.orgId)
    return result
  })

export const getApiKeyActivitiesFn = createServerFn({ method: 'GET' })
  .inputValidator(apiActivityPageSchema)
  .middleware([authMiddleware])
  .handler(({ context, data }) => {
    requireSuperAdmin(context)
    return listApiKeyActivitiesPage(data.page)
  })

export const getOperationsHealthFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(({ context }) => {
    requireSuperAdmin(context)
    return getOperationsHealth()
  })

export const runCacheMaintenanceFn = createServerFn({ method: 'POST' })
  .inputValidator(cacheMaintenanceSchema)
  .middleware([authMiddleware])
  .handler(({ context, data }) => {
    requireSuperAdmin(context)
    requireSelfHost()
    return runCacheMaintenance(data)
  })

export const getOperationsConfigFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(({ context }) => {
    requireSuperAdmin(context)
    requireSelfHost()
    return getOperationsConfig()
  })

export const getResourceTrendFn = createServerFn({ method: 'GET' })
  .inputValidator(resourceTrendSchema)
  .middleware([authMiddleware])
  .handler(({ context, data }) => {
    requireSuperAdmin(context)
    return getResourceTrend(data.range)
  })

export const updateOperationsConfigFn = createServerFn({ method: 'POST' })
  .inputValidator(operationsConfigSchema)
  .middleware([authMiddleware])
  .handler(({ context, data }) => {
    requireSuperAdmin(context)
    requireSelfHost()
    return updateOperationsConfig({
      diskCacheMaxMb: data.diskCacheMaxMb,
      memoryCacheMaxMb: data.memoryCacheMaxMb,
    })
  })

export const createApiKeyFn = createServerFn({ method: 'POST' })
  .inputValidator(createApiKeySchema)
  .middleware([authMiddleware])
  .handler(({ context, data }) => {
    requireSuperAdmin(context)
    return createApiKey({
      name: data.name,
      projectId: data.projectId,
      userId: context.userId,
    })
  })

export const disableApiKeyFn = createServerFn({ method: 'POST' })
  .inputValidator(disableApiKeySchema)
  .middleware([authMiddleware])
  .handler(({ context, data }) => {
    requireSuperAdmin(context)
    return disableApiKey(data.id)
  })

export const createInvitationFn = createServerFn({ method: 'POST' })
  .inputValidator(createInvitationSchema)
  .middleware([authMiddleware])
  .handler(({ context, data }) => {
    requireSuperAdmin(context)
    // Staff invitations are the SELF-HOST operator flow: they add a user to the
    // single shared org_default. In cloud this path creates a user with NO org
    // membership (a permanently broken, org-less account), so it is self-host
    // only — cloud team management is org-scoped via the organization plugin.
    requireSelfHost()
    return createInvitation({
      email: data.email,
      role: data.role,
      expiresDays: data.expiresDays,
      invitedById: context.userId,
      sendEmail: data.sendEmail,
    })
  })

export const revokeInvitationFn = createServerFn({ method: 'POST' })
  .inputValidator(revokeInvitationSchema)
  .middleware([authMiddleware])
  .handler(({ context, data }) => {
    requireSuperAdmin(context)
    requireSelfHost()
    return revokeInvitation(data.id)
  })

export const getInvitationFn = createServerFn({ method: 'GET' })
  .inputValidator(invitationTokenSchema)
  .handler(({ data }) => {
    requireSelfHost()
    return getInvitation(data.token)
  })

export const acceptInvitationFn = createServerFn({ method: 'POST' })
  .inputValidator(acceptInvitationSchema)
  .handler(({ data }) => {
    requireSelfHost()
    return acceptInvitation(data)
  })

export const updateCloudflareSettingsFn = createServerFn({ method: 'POST' })
  .inputValidator(cloudflareSettingsSchema)
  .middleware([authMiddleware])
  .handler(({ context, data }) => {
    // Cloudflare edge analytics is a platform-operator integration, not per-tenant
    // instance config, so unlike SMTP/cache it stays available to the super-admin
    // in cloud too — they own the zone and toggle its visibility here.
    requireSuperAdmin(context)
    return updateCloudflareSettings({
      enabled: data.enabled,
      // A blank token means "keep the saved one"; only persist a real change.
      apiToken: data.apiToken || undefined,
      zoneId: data.zoneId,
      host: data.host,
    })
  })

export const testCloudflareConnectionFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .handler(({ context }) => {
    // Same as updateCloudflareSettingsFn — operator integration, cloud-allowed.
    requireSuperAdmin(context)
    return testCloudflareConnection()
  })
