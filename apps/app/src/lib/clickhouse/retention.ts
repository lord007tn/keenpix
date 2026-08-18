import {
  ensureClickhouseSchemaReady,
  getClickhouseClient,
} from '@keenpix/clickhouse'
import { errorContext, logger } from '@/lib/logger/logger'

// ClickHouse DateTime64(3) literal (UTC), same shape events are written with.
function toClickhouseDateTime(date: Date): string {
  return date.toISOString().replace('T', ' ').replace('Z', '')
}

// Per-org retention delete for the advanced-logs store. Uses a lightweight
// DELETE (ClickHouse 23.3+; the compose ships 24.8): rows disappear from reads
// immediately and merge away in the background. Best-effort like every other
// ClickHouse write — Postgres pruning is the enforcement floor, this keeps the
// advanced tier consistent with it. No-op when ClickHouse is unconfigured.
export async function deleteRequestEventsBefore(
  orgId: string,
  cutoff: Date,
): Promise<void> {
  const client = getClickhouseClient()
  if (!client) {
    return
  }
  try {
    await ensureClickhouseSchemaReady()
    await client.command({
      query:
        'DELETE FROM request_events WHERE org_id = {orgId:String} AND ts < {cutoff:DateTime64(3)}',
      query_params: { orgId, cutoff: toClickhouseDateTime(cutoff) },
    })
  } catch (error) {
    logger.warn(
      { ...errorContext(error), orgId },
      'clickhouse retention delete failed',
    )
  }
}
