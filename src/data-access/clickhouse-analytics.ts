import {
  emptyLatencyBucketCounts,
  LATENCY_BUCKETS,
  type LatencyBucketCounts,
} from '@/helpers/analytics/latency-buckets'
import type {
  BucketAgg,
  BucketStatusAgg,
  CountryAgg,
  FormatAgg,
  HostAgg,
  ProjectAgg,
  RollupSummaryAgg,
} from '@/helpers/analytics/rollup-shapers'
import { queryRows } from '@/lib/clickhouse/query'
import { ensureClickhouseSchemaReady } from '@/lib/clickhouse/schema'
import type { TopImageRow } from '@/shared/types'
import type { WindowOpts } from './analytics-aggregates'

// ClickHouse-backed analytics: the same aggregates as analytics-aggregates.ts
// (Postgres hourly rollups) but computed from raw request_events, so an org on
// the advanced tier gets full-fidelity, arbitrary-window analytics. Every
// function returns the exact Agg shape the pure shapers already consume, so the
// analytics payload is identical regardless of source.

function chDateTime(date: Date): string {
  return date.toISOString().replace('T', ' ').replace('Z', '')
}

function toDate(clickhouseTs: string): Date {
  return new Date(`${clickhouseTs.replace(' ', 'T')}Z`)
}

// Disjoint latency histogram columns, generated from the shared bucket table so
// the boundaries can never drift from the Postgres/UI definition. Each event
// lands in exactly one bucket: (prevMax, thisMax], with the first as <= max and
// the last as > 1100.
const LATENCY_SELECT = LATENCY_BUCKETS.map((bucket, index) => {
  if (index === 0) {
    return `countIf(latency_ms <= ${bucket.max}) AS ${bucket.field}`
  }
  const prev = LATENCY_BUCKETS[index - 1].max
  if (bucket.field === 'latencyGt1100') {
    return `countIf(latency_ms > ${prev}) AS ${bucket.field}`
  }
  return `countIf(latency_ms > ${prev} AND latency_ms <= ${bucket.max}) AS ${bucket.field}`
}).join(',\n')

function latencyCountsFrom(
  row: Partial<Record<string, number>>,
): LatencyBucketCounts {
  const counts = emptyLatencyBucketCounts()
  for (const bucket of LATENCY_BUCKETS) {
    counts[bucket.field] = Number(row[bucket.field] ?? 0)
  }
  return counts
}

// Build the shared WHERE clause + params, mirroring analytics-aggregates.whereFor
// exactly: tenant scope first (org_id), then the time window, then the optional
// project/format/domain/status filters. Parameterized so nothing is interpolated.
function buildWhere(opts: WindowOpts): {
  sql: string
  params: Record<string, unknown>
} {
  const conditions = ['org_id = {orgId:String}', 'ts >= {gte:DateTime64(3)}']
  const params: Record<string, unknown> = {
    orgId: opts.orgId,
    gte: chDateTime(opts.gte),
  }
  if (opts.lt) {
    conditions.push('ts < {lt:DateTime64(3)}')
    params.lt = chDateTime(opts.lt)
  }
  if (opts.projectId) {
    conditions.push('project_id = {projectId:String}')
    params.projectId = opts.projectId
  }
  const f = opts.filters
  if (f?.format && f.format.length > 0) {
    conditions.push('format IN {formats:Array(String)}')
    params.formats = f.format
  }
  if (f?.domain && f.domain.length > 0) {
    conditions.push('source_host IN {domains:Array(String)}')
    params.domains = f.domain
  }
  if (f?.status && f.status.length > 0) {
    const codes = f.status.map(Number).filter((n) => !Number.isNaN(n))
    if (codes.length > 0) {
      conditions.push('status IN {statuses:Array(UInt16)}')
      params.statuses = codes
    }
  }
  return { sql: conditions.join(' AND '), params }
}

async function selectRows<T>(
  query: string,
  params: Record<string, unknown>,
): Promise<T[]> {
  await ensureClickhouseSchemaReady()
  return queryRows<T>(query, params)
}

export async function aggregateRollupSummary(
  opts: WindowOpts,
): Promise<RollupSummaryAgg> {
  const { sql, params } = buildWhere(opts)
  const rows = await selectRows<Record<string, number>>(
    `SELECT
       count() AS requests,
       countIf(cached = 1) AS cachedRequests,
       sum(bytes_in) AS bytesIn,
       sum(bytes_out) AS bytesOut,
       sum(bytes_saved) AS bytesSaved,
       sum(latency_ms) AS latencyMsSum,
       ${LATENCY_SELECT}
     FROM request_events
     WHERE ${sql}`,
    params,
  )
  const row = rows[0] ?? {}
  return {
    requests: Number(row.requests ?? 0),
    cachedRequests: Number(row.cachedRequests ?? 0),
    bytesIn: Number(row.bytesIn ?? 0),
    bytesOut: Number(row.bytesOut ?? 0),
    bytesSaved: Number(row.bytesSaved ?? 0),
    latencyMsSum: Number(row.latencyMsSum ?? 0),
    latency: latencyCountsFrom(row),
  }
}

export async function groupRollupsByBucket(
  opts: WindowOpts,
): Promise<BucketAgg[]> {
  const { sql, params } = buildWhere(opts)
  const rows = await selectRows<Record<string, number | string>>(
    `SELECT
       toString(toStartOfHour(ts)) AS bucketStart,
       count() AS requests,
       countIf(cached = 1) AS cachedRequests,
       countIf(cached = 0) AS optimizedRequests,
       sum(bytes_in) AS bytesIn,
       sum(bytes_out) AS bytesOut,
       sum(bytes_saved) AS bytesSaved,
       ${LATENCY_SELECT}
     FROM request_events
     WHERE ${sql}
     GROUP BY bucketStart
     ORDER BY bucketStart`,
    params,
  )
  return rows.map((r) => ({
    bucketStart: toDate(String(r.bucketStart)),
    requests: Number(r.requests ?? 0),
    cachedRequests: Number(r.cachedRequests ?? 0),
    optimizedRequests: Number(r.optimizedRequests ?? 0),
    bytesIn: Number(r.bytesIn ?? 0),
    bytesOut: Number(r.bytesOut ?? 0),
    bytesSaved: Number(r.bytesSaved ?? 0),
    latency: latencyCountsFrom(r as Record<string, number>),
  }))
}

export async function groupRollupsByBucketStatus(
  opts: WindowOpts,
): Promise<BucketStatusAgg[]> {
  const { sql, params } = buildWhere(opts)
  const rows = await selectRows<{
    bucketStart: string
    status: number
    requests: number
  }>(
    `SELECT
       toString(toStartOfHour(ts)) AS bucketStart,
       status,
       count() AS requests
     FROM request_events
     WHERE ${sql}
     GROUP BY bucketStart, status`,
    params,
  )
  return rows.map((r) => ({
    bucketStart: toDate(r.bucketStart),
    status: Number(r.status),
    requests: Number(r.requests ?? 0),
  }))
}

export async function groupRollupsByFormat(
  opts: WindowOpts,
): Promise<FormatAgg[]> {
  const { sql, params } = buildWhere(opts)
  const rows = await selectRows<{
    format: string
    requests: number
    saved: number
  }>(
    `SELECT format, count() AS requests, sum(bytes_saved) AS saved
     FROM request_events
     WHERE ${sql}
     GROUP BY format`,
    params,
  )
  return rows.map((r) => ({
    format: r.format,
    requests: Number(r.requests ?? 0),
    saved: Number(r.saved ?? 0),
  }))
}

export async function groupRollupsByPath(
  opts: WindowOpts,
): Promise<TopImageRow[]> {
  const { sql, params } = buildWhere(opts)
  const rows = await selectRows<{
    label: string
    requests: number
    bytes: number
  }>(
    `SELECT path AS label, count() AS requests, sum(bytes_out) AS bytes
     FROM request_events
     WHERE ${sql}
     GROUP BY path
     ORDER BY requests DESC, label ASC
     LIMIT 20`,
    params,
  )
  return rows.map((r) => ({
    label: r.label,
    requests: Number(r.requests ?? 0),
    bytes: Number(r.bytes ?? 0),
  }))
}

export async function groupRollupsByCountry(
  opts: WindowOpts,
): Promise<CountryAgg[]> {
  const { sql, params } = buildWhere(opts)
  const rows = await selectRows<{
    country: string
    requests: number
    saved: number
  }>(
    `SELECT country, count() AS requests, sum(bytes_saved) AS saved
     FROM request_events
     WHERE ${sql}
     GROUP BY country`,
    params,
  )
  return rows.map((r) => ({
    country: r.country,
    requests: Number(r.requests ?? 0),
    saved: Number(r.saved ?? 0),
  }))
}

export async function groupRollupsByProject(
  opts: WindowOpts,
): Promise<ProjectAgg[]> {
  const { sql, params } = buildWhere(opts)
  const rows = await selectRows<{
    projectId: string
    requests: number
    cachedRequests: number
    bytesSaved: number
    latencyMsSum: number
  }>(
    `SELECT
       project_id AS projectId,
       count() AS requests,
       countIf(cached = 1) AS cachedRequests,
       sum(bytes_saved) AS bytesSaved,
       sum(latency_ms) AS latencyMsSum
     FROM request_events
     WHERE ${sql}
     GROUP BY projectId`,
    params,
  )
  return rows.map((r) => ({
    projectId: r.projectId,
    requests: Number(r.requests ?? 0),
    cachedRequests: Number(r.cachedRequests ?? 0),
    bytesSaved: Number(r.bytesSaved ?? 0),
    latencyMsSum: Number(r.latencyMsSum ?? 0),
  }))
}

export async function groupRollupsByHost(opts: WindowOpts): Promise<HostAgg[]> {
  const { sql, params } = buildWhere(opts)
  const rows = await selectRows<{
    sourceHost: string
    requests: number
    cachedRequests: number
    bytesSaved: number
    latencyMsSum: number
    lastSeen: string
  }>(
    `SELECT
       source_host AS sourceHost,
       count() AS requests,
       countIf(cached = 1) AS cachedRequests,
       sum(bytes_saved) AS bytesSaved,
       sum(latency_ms) AS latencyMsSum,
       toString(max(ts)) AS lastSeen
     FROM request_events
     WHERE ${sql}
     GROUP BY sourceHost`,
    params,
  )
  return rows.map((r) => ({
    sourceHost: r.sourceHost,
    requests: Number(r.requests ?? 0),
    cachedRequests: Number(r.cachedRequests ?? 0),
    bytesSaved: Number(r.bytesSaved ?? 0),
    latencyMsSum: Number(r.latencyMsSum ?? 0),
    lastSeen: r.lastSeen ? toDate(r.lastSeen) : null,
  }))
}

export async function listAvailableFilters(opts: WindowOpts) {
  const { sql, params } = buildWhere(opts)
  const rows = await selectRows<{
    formats: string[]
    statuses: number[]
    domains: string[]
  }>(
    `SELECT
       groupUniqArray(format) AS formats,
       groupUniqArray(status) AS statuses,
       groupUniqArray(source_host) AS domains
     FROM request_events
     WHERE ${sql}`,
    params,
  )
  const row = rows[0] ?? { formats: [], statuses: [], domains: [] }
  return {
    formats: [...row.formats].sort(),
    statuses: [...row.statuses].map(Number).sort((a, b) => a - b),
    domains: [...row.domains].filter(Boolean).sort(),
  }
}
