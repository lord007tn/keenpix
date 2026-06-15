import { createServerFn } from '@tanstack/react-start'
import {
  createApiKey,
  disableApiKey,
  listApiKeyActivitiesPage,
} from '@/actions/admin/api-keys'
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
import { sendTestEmail, updateSmtpSettings } from '@/actions/admin/smtp'
import { getAdminWorkspace } from '@/actions/admin/workspace'
import { authMiddleware, requireSuperAdmin } from '@/lib/auth/guards'
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
  sendTestEmailSchema,
  smtpSettingsSchema,
} from '@/schemas/admin'
import { createApiKeySchema, disableApiKeySchema } from '@/schemas/api-keys'

export const getAdminWorkspaceFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(({ context }) => {
    requireSuperAdmin(context)
    return getAdminWorkspace()
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
    return runCacheMaintenance(data)
  })

export const getOperationsConfigFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(({ context }) => {
    requireSuperAdmin(context)
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
    return revokeInvitation(data.id)
  })

export const getInvitationFn = createServerFn({ method: 'GET' })
  .inputValidator(invitationTokenSchema)
  .handler(({ data }) => getInvitation(data.token))

export const acceptInvitationFn = createServerFn({ method: 'POST' })
  .inputValidator(acceptInvitationSchema)
  .handler(({ data }) => acceptInvitation(data))

export const updateSmtpSettingsFn = createServerFn({ method: 'POST' })
  .inputValidator(smtpSettingsSchema)
  .middleware([authMiddleware])
  .handler(({ context, data }) => {
    requireSuperAdmin(context)
    return updateSmtpSettings({
      enabled: data.enabled,
      host: data.host,
      port: data.port,
      secure: data.secure,
      username: data.username,
      password: data.password || undefined,
      fromEmail: data.fromEmail,
      fromName: data.fromName,
    })
  })

export const sendTestEmailFn = createServerFn({ method: 'POST' })
  .inputValidator(sendTestEmailSchema)
  .middleware([authMiddleware])
  .handler(({ context, data }) => {
    requireSuperAdmin(context)
    return sendTestEmail(data.to)
  })

export const updateCloudflareSettingsFn = createServerFn({ method: 'POST' })
  .inputValidator(cloudflareSettingsSchema)
  .middleware([authMiddleware])
  .handler(({ context, data }) => {
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
    requireSuperAdmin(context)
    return testCloudflareConnection()
  })
