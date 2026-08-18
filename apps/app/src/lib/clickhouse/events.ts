import {
  ensureClickhouseSchemaReady,
  getClickhouseClient,
  queryRows,
} from '@keenpix/clickhouse'
import type { LogListFilters } from '@/data-access/logs'
import { errorContext, logger } from '@/lib/logger/logger'
import { isLogFormat } from '@/shared/types'

// Input mirrors a persisted RequestLog (NewRequestLog + the row's id/ts).
export interface RequestEventInput {
  bytesIn: number
  bytesOut: number
  bytesSaved: number
  cached: boolean
  country?: string | null
  format: string
  id: string
  latencyMs: number
  orgId: string
  path: string
  projectId: string
  quality?: number | null
  region?: string | null
  sourceHost?: string | null
  status: number
  ts: Date
  width?: number | null
}

// The columnar row shape (snake_case, non-null) inserted via JSONEachRow.
interface RequestEventRow {
  bytes_in: number
  bytes_out: number
  bytes_saved: number
  cached: number
  country: string
  format: string
  id: string
  latency_ms: number
  org_id: string
  path: string
  project_id: string
  quality: number
  region: string
  source_host: string
  status: number
  ts: string
  width: number
}

// ClickHouse DateTime64(3) wants 'YYYY-MM-DD HH:MM:SS.sss' (UTC). ISO gives us
// exactly that once the 'T'/'Z' are stripped.
function toClickhouseDateTime(date: Date): string {
  return date.toISOString().replace('T', ' ').replace('Z', '')
}

// Pure mapper (unit-tested): RequestEventInput -> columnar row. Nullable string
// columns collapse to '' and numeric to 0 so the MergeTree row is never null.
export function toRequestEventRow(input: RequestEventInput): RequestEventRow {
  return {
    id: input.id,
    org_id: input.orgId,
    project_id: input.projectId,
    ts: toClickhouseDateTime(input.ts),
    path: input.path,
    source_host: input.sourceHost ?? '',
    width: input.width ?? 0,
    quality: input.quality ?? 0,
    format: input.format,
    status: input.status,
    cached: input.cached ? 1 : 0,
    latency_ms: input.latencyMs,
    bytes_in: input.bytesIn,
    bytes_out: input.bytesOut,
    bytes_saved: input.bytesSaved,
    region: input.region ?? '',
    country: input.country ?? '',
  }
}

// Best-effort mirror of a batch of requests into ClickHouse for the advanced
// tier. Fire and forget: a lost batch must never fail serving, and Postgres
// RequestLog remains the source of truth for the basic tier. No-op when
// unconfigured. Called with whole flush batches by the analytics buffer, so
// ClickHouse sees few large inserts instead of one insert per request — exactly
// how MergeTree wants to be fed.
export function recordRequestEvents(inputs: RequestEventInput[]): void {
  const client = getClickhouseClient()
  if (!(client && inputs.length > 0)) {
    return
  }
  // Ensure the table exists once, then insert; both stay off the request's
  // critical path (the caller does not await this).
  ensureClickhouseSchemaReady()
    .then(() =>
      client.insert({
        table: 'request_events',
        values: inputs.map(toRequestEventRow),
        format: 'JSONEachRow',
      }),
    )
    .catch((error) => {
      logger.warn(
        errorContext(error),
        'clickhouse request_events insert failed',
      )
    })
}

// Row shape returned by the search query (aliased to the log-view field names).
interface SearchRow {
  bytesIn: number
  bytesOut: number
  bytesSaved: number
  cached: number
  format: string
  id: string
  latency: number
  path: string
  projectId: string
  q: number
  sourceHost: string
  status: number
  ts: string
  w: number
}

function toIso(clickhouseTs: string): string {
  const parsed = new Date(`${clickhouseTs.replace(' ', 'T')}Z`)
  return Number.isNaN(parsed.getTime()) ? clickhouseTs : parsed.toISOString()
}

// ClickHouse ILIKE treats % and _ as wildcards and \ as the escape char. Escape
// them so a user's search term matches literally, mirroring the Postgres path's
// Prisma `contains` (which escapes LIKE metacharacters) — otherwise a term like
// `%2F` or `/hero_banner` would match far more broadly on the advanced tier.
const LIKE_METACHARS = /[\\%_]/g

function escapeLike(term: string): string {
  return term.replace(LIKE_METACHARS, '\\$&')
}

// Full-history log search over ClickHouse — the advanced-logs backend. Mirrors
// the Postgres listLogs filter semantics as a parameterized query, and returns
// the identical row shape so the log view is store-agnostic. Empty when
// ClickHouse is unconfigured (the caller falls back to Postgres).
export async function searchRequestEvents(params: {
  filters?: LogListFilters
  limit: number
  orgId: string
  projectId?: string
}) {
  const conditions = ['org_id = {orgId:String}']
  const qp: Record<string, unknown> = {
    orgId: params.orgId,
    limit: Math.min(Math.max(params.limit, 1), 1000),
  }
  const f = params.filters

  if (params.projectId) {
    conditions.push('project_id = {projectId:String}')
    qp.projectId = params.projectId
  }
  if (f?.gte) {
    conditions.push('ts >= {gte:DateTime64(3)}')
    qp.gte = toClickhouseDateTime(f.gte)
  }
  if (f?.lt) {
    conditions.push('ts < {lt:DateTime64(3)}')
    qp.lt = toClickhouseDateTime(f.lt)
  }
  if (f?.format && f.format.length > 0) {
    conditions.push('format IN {formats:Array(String)}')
    qp.formats = f.format.filter(isLogFormat)
  }
  if (f?.status && f.status.length > 0) {
    const statuses = f.status.map(Number).filter((n) => !Number.isNaN(n))
    if (statuses.length > 0) {
      conditions.push('status IN {statuses:Array(UInt16)}')
      qp.statuses = statuses
    }
  }
  if (f?.cache && f.cache.length === 1) {
    if (f.cache[0] === 'hit') {
      conditions.push('cached = 1')
    }
    if (f.cache[0] === 'miss') {
      conditions.push('cached = 0')
    }
  }
  if (f?.domain && f.domain.length > 0) {
    conditions.push('source_host IN {domains:Array(String)}')
    qp.domains = f.domain
  }
  const search = f?.search?.trim()
  if (search && search.length >= 2) {
    // Mirror the Postgres listLogs search exactly, or the advanced (paid) tier
    // silently drops matches the basic tier finds: an id, an HTTP status like
    // 404, or a format like webp all match there but not here.
    const searchConditions = [
      'path ILIKE {search:String}',
      'source_host ILIKE {search:String}',
    ]
    qp.search = `%${escapeLike(search)}%`
    if (search.length >= 8) {
      searchConditions.push('id = {searchId:String}')
      qp.searchId = search
    }
    if (isLogFormat(search)) {
      searchConditions.push('format = {searchFormat:String}')
      qp.searchFormat = search
    }
    const numeric = Number(search)
    if (Number.isInteger(numeric)) {
      searchConditions.push('status = {searchStatus:UInt16}')
      qp.searchStatus = numeric
    }
    conditions.push(`(${searchConditions.join(' OR ')})`)
  }

  // Make sure the table exists before the first read on a fresh instance.
  await ensureClickhouseSchemaReady()

  const query = `
    SELECT
      id,
      project_id AS projectId,
      toString(ts) AS ts,
      path,
      source_host AS sourceHost,
      width AS w,
      quality AS q,
      format,
      status,
      cached,
      latency_ms AS latency,
      bytes_in AS bytesIn,
      bytes_out AS bytesOut,
      bytes_saved AS bytesSaved
    FROM request_events
    WHERE ${conditions.join(' AND ')}
    ORDER BY ts DESC
    LIMIT {limit:UInt32}
  `

  const rows = await queryRows<SearchRow>(query, qp)
  return rows.map((r) => ({
    id: r.id,
    projectId: r.projectId,
    ts: toIso(r.ts),
    path: r.path,
    sourceHost: r.sourceHost || null,
    w: r.w ?? 0,
    q: r.q ?? 0,
    format: isLogFormat(r.format) ? r.format : 'jpeg',
    status: r.status,
    cached: r.cached === 1,
    latency: r.latency,
    bytesIn: r.bytesIn,
    bytesOut: r.bytesOut,
    bytesSaved: r.bytesSaved,
  }))
}
