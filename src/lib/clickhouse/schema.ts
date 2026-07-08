import { getClickhouseClient } from './client'

// Raw request events retention. 365 days matches the longest plan log retention
// (Business); TTL prunes older partitions automatically.
const RETENTION_DAYS = 365

// Mirrors the Postgres RequestLog row. MergeTree partitioned by month and
// ordered for the (org, project, time) access pattern the log/analytics views
// use; enum-ish columns are LowCardinality, and path/source_host carry bloom
// filters so full-history log search stays fast. The client is bound to
// CLICKHOUSE_DATABASE, so the table is unqualified (that DB must already exist).
const REQUEST_EVENTS_DDL = `
CREATE TABLE IF NOT EXISTS request_events (
  id String,
  org_id String,
  project_id String,
  ts DateTime64(3),
  path String,
  source_host String,
  width UInt16,
  quality UInt8,
  format LowCardinality(String),
  status UInt16,
  cached UInt8,
  latency_ms Float32,
  bytes_in UInt32,
  bytes_out UInt32,
  bytes_saved UInt32,
  region LowCardinality(String),
  country LowCardinality(String),
  INDEX idx_source_host source_host TYPE bloom_filter GRANULARITY 4,
  INDEX idx_path path TYPE tokenbf_v1(4096, 3, 0) GRANULARITY 4
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(ts)
ORDER BY (org_id, project_id, ts)
TTL toDateTime(ts) + INTERVAL ${RETENTION_DAYS} DAY
`

// Idempotent (CREATE TABLE IF NOT EXISTS) — safe to run repeatedly. A no-op when
// ClickHouse is unconfigured.
async function ensureClickhouseSchema(): Promise<void> {
  const client = getClickhouseClient()
  if (!client) {
    return
  }
  await client.command({ query: REQUEST_EVENTS_DDL })
}

let ready: Promise<void> | null = null

// Memoized: ensures the schema exactly once per process (there's no single
// startup hook, so the first read/write triggers it). On failure it resets so a
// later call retries — e.g. ClickHouse briefly unreachable at the first write.
export function ensureClickhouseSchemaReady(): Promise<void> {
  if (!ready) {
    ready = ensureClickhouseSchema().catch((error) => {
      ready = null
      throw error
    })
  }
  return ready
}
