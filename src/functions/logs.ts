import { createServerFn } from '@tanstack/react-start'
import { readLogs } from '@/actions/logs'
import { getOrgPlan } from '@/data-access/subscriptions'
import { authMiddleware, requireActiveOrg } from '@/lib/auth/guards'
import { BASIC_LOG_LIMIT } from '@/lib/billing/plans'
import { logsQuerySchema } from '@/schemas/logs'
import { isCloud } from '@/server/deployment'

const ADVANCED_LOG_LIMIT = 500

// Log tiering: self-host always gets full logs; cloud gets the plan's tier —
// advanced (Pro+) sees full history + search, basic sees only the most-recent
// window (BASIC_LOG_LIMIT) with search disabled. The store is ClickHouse for all
// tiers (with a Postgres fallback) — see readLogs; the tier only governs the row
// limit and whether search is allowed.
async function orgLogsAdvanced(orgId: string): Promise<boolean> {
  if (!isCloud()) {
    return true
  }
  const plan = await getOrgPlan(orgId)
  return plan?.advancedLogs ?? false
}

export const listLogsFn = createServerFn({ method: 'GET' })
  .inputValidator(logsQuerySchema)
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const orgId = requireActiveOrg(context)
    const advanced = await orgLogsAdvanced(orgId)
    const limit = advanced ? ADVANCED_LOG_LIMIT : BASIC_LOG_LIMIT
    // Basic can't full-text search history — it only sees the recent window.
    const filters = advanced ? data : { ...data, search: undefined }
    return readLogs(orgId, data.project, limit, filters)
  })
