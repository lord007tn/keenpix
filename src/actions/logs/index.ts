import type { LogListFilters } from '@/data-access/logs'
import { listLogs as listLogsInDb } from '@/data-access/logs'
import { resolveProjectId } from '@/data-access/projects'
import { clickhouseEnabled } from '@/lib/clickhouse/config'
import { searchRequestEvents } from '@/lib/clickhouse/events'
import { errorContext, logger } from '@/lib/logger/logger'

// Unified log read for every log surface (the logs page, the live stream, and the
// dashboard's recent activity). ClickHouse is the store for ALL logs; Postgres
// RequestLog is a transparent fallback for when ClickHouse is unconfigured (a
// self-host instance without it) or momentarily unreachable, so logs never go
// dark. Project resolution is org-scoped so a foreign ?project= id can't select
// another tenant's logs; an unknown id collapses to the org-wide view. The row
// shape is identical from either store, so callers are store-agnostic.
export async function readLogs(
  orgId: string,
  project?: string,
  limit = 200,
  filters?: LogListFilters,
) {
  const projectId = await resolveProjectId(project, orgId)
  if (clickhouseEnabled()) {
    try {
      return await searchRequestEvents({ orgId, filters, limit, projectId })
    } catch (error) {
      logger.warn(
        errorContext(error),
        'clickhouse log read failed; falling back to postgres',
      )
    }
  }
  return listLogsInDb({ orgId, filters, limit, projectId })
}
