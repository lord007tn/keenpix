import { createServerFn } from '@tanstack/react-start'
import { readLogs } from '@/actions/logs'
import { getOrgPlan } from '@/data-access/subscriptions'
import {
  getHistoryWindowDates,
  limitHistorySearch,
} from '@/helpers/history/window'
import { authMiddleware, requireActiveOrg } from '@/lib/auth/guards'
import { BASIC_LOG_LIMIT, DEFAULT_HISTORY_DAYS } from '@/lib/billing/plans'
import { logsQuerySchema } from '@/schemas/logs'
import { isCloud } from '@/server/deployment'

const ADVANCED_LOG_LIMIT = 500

export const listLogsFn = createServerFn({ method: 'GET' })
  .inputValidator(logsQuerySchema)
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const orgId = requireActiveOrg(context)
    const cloud = isCloud()
    const plan = cloud ? await getOrgPlan(orgId) : null
    const advanced = !cloud || (plan?.advancedLogs ?? false)
    const limit = advanced ? ADVANCED_LOG_LIMIT : BASIC_LOG_LIMIT
    const window = limitHistorySearch(
      data,
      cloud ? (plan?.historyDays ?? DEFAULT_HISTORY_DAYS) : undefined,
    )
    const dates = getHistoryWindowDates(window)
    // Basic can select its retained date window, but full-text search remains a
    // Pro feature. Every filter is still enforced inside the caller's org.
    const filters = {
      cache: data.cache,
      domain: data.domain,
      format: data.format,
      gte: dates.gte,
      lt: dates.lt,
      search: advanced ? data.search : undefined,
      status: data.status,
    }
    return readLogs(orgId, data.project, limit, filters)
  })
