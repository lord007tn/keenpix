import { createServerFn } from '@tanstack/react-start'
import { getPlatformConfig } from '@/actions/admin/cdn'
import { getCustomerUsageSeries } from '@/actions/admin/customer-analytics'
import {
  getCustomerAccountById,
  getCustomerAccounts,
  setOrgSuspension,
  updateCustomerComplimentaryPlan,
} from '@/actions/admin/customers'
import {
  getFinanceDashboard,
  getFinanceSettings,
  updateFinanceSettings,
} from '@/actions/admin/finance'
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
import { getPlatformAnalytics } from '@/actions/admin/platform-analytics'
import { getAdminWorkspace } from '@/actions/admin/workspace'
import {
  authMiddleware,
  requireSelfHost,
  requireSuperAdmin,
} from '@/lib/auth/guards'
import { bustServingEntitlement } from '@/lib/billing/service-gate'
import {
  acceptInvitationSchema,
  cacheMaintenanceSchema,
  createInvitationSchema,
  customerAccountSchema,
  customerAnalyticsSchema,
  financeSettingsSchema,
  invitationTokenSchema,
  operationsConfigSchema,
  platformAnalyticsSchema,
  resourceTrendSchema,
  revokeInvitationSchema,
  suspendOrgSchema,
  updateComplimentaryPlanSchema,
} from '@/schemas/admin'

export const getAdminWorkspaceFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(({ context }) => {
    requireSuperAdmin(context)
    return getAdminWorkspace()
  })

export const getCustomerAccountsFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(({ context }) => {
    requireSuperAdmin(context)
    return getCustomerAccounts()
  })

export const getCustomerAccountFn = createServerFn({ method: 'GET' })
  .inputValidator(customerAccountSchema)
  .middleware([authMiddleware])
  .handler(({ context, data }) => {
    requireSuperAdmin(context)
    return getCustomerAccountById(data.orgId)
  })

export const getPlatformAnalyticsFn = createServerFn({ method: 'GET' })
  .inputValidator(platformAnalyticsSchema)
  .middleware([authMiddleware])
  .handler(({ context, data }) => {
    requireSuperAdmin(context)
    return getPlatformAnalytics(data)
  })

export const getFinanceDashboardFn = createServerFn({ method: 'GET' })
  .inputValidator(platformAnalyticsSchema)
  .middleware([authMiddleware])
  .handler(({ context, data }) => {
    requireSuperAdmin(context)
    return getFinanceDashboard(data)
  })

export const getFinanceSettingsFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(({ context }) => {
    requireSuperAdmin(context)
    return getFinanceSettings()
  })

export const updateFinanceSettingsFn = createServerFn({ method: 'POST' })
  .inputValidator(financeSettingsSchema)
  .middleware([authMiddleware])
  .handler(({ context, data }) => {
    requireSuperAdmin(context)
    return updateFinanceSettings(data)
  })

export const updateComplimentaryPlanFn = createServerFn({ method: 'POST' })
  .inputValidator(updateComplimentaryPlanSchema)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    requireSuperAdmin(context)
    const result = await updateCustomerComplimentaryPlan({
      orgId: data.orgId,
      plan: data.plan,
      actorId: context.userId,
    })
    // Complimentary access can change whether/what an org is served immediately.
    // request rather than after the serving gate's TTL.
    bustServingEntitlement(data.orgId)
    return result
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

export const getPlatformConfigFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(({ context }) => {
    requireSuperAdmin(context)
    return getPlatformConfig()
  })

export const getCustomerAnalyticsFn = createServerFn({ method: 'GET' })
  .inputValidator(customerAnalyticsSchema)
  .middleware([authMiddleware])
  .handler(({ context, data }) => {
    requireSuperAdmin(context)
    return getCustomerUsageSeries(data.orgId, data)
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
