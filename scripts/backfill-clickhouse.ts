// Backfill ClickHouse `request_events` from the Postgres RequestLog history.
//
// When you first enable ClickHouse (advanced analytics + full-history logs), the
// columnar store only has events written *after* enablement — so historical
// analytics/log windows would look empty until it fills. Run this once to seed
// it with existing Postgres history:
//
//   pnpm tsx scripts/backfill-clickhouse.ts
//
// Idempotency: request_events is a plain MergeTree and does NOT dedup, so a naive
// re-run (or running while the app is live-teeing) would double-count every
// overlapping event. This script refuses to run when the table already has rows,
// unless you pass `--truncate` (clear + clean rebuild) or `--force` (append
// anyway). Either way, stop the app's live tee first. The row mapping mirrors
// src/lib/clickhouse/events.ts exactly.
import 'dotenv/config'
import { createClient } from '@clickhouse/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const BATCH = 5000

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
TTL toDateTime(ts) + INTERVAL 365 DAY
`

function chDateTime(date: Date): string {
  return date.toISOString().replace('T', ' ').replace('Z', '')
}

interface DbLog {
  bytesIn: number
  bytesOut: number
  bytesSaved: number
  cached: boolean
  country: string | null
  format: string
  id: string
  latencyMs: number
  orgId: string
  path: string
  projectId: string
  quality: number | null
  region: string | null
  sourceHost: string | null
  status: number
  ts: Date
  width: number | null
}

function toRow(log: DbLog) {
  return {
    id: log.id,
    org_id: log.orgId,
    project_id: log.projectId,
    ts: chDateTime(log.ts),
    path: log.path,
    source_host: log.sourceHost ?? '',
    width: log.width ?? 0,
    quality: log.quality ?? 0,
    format: log.format,
    status: log.status,
    cached: log.cached ? 1 : 0,
    latency_ms: log.latencyMs,
    bytes_in: log.bytesIn,
    bytes_out: log.bytesOut,
    bytes_saved: log.bytesSaved,
    region: log.region ?? '',
    country: log.country ?? '',
  }
}

async function main() {
  const url = process.env.CLICKHOUSE_URL
  const databaseUrl = process.env.DATABASE_URL
  if (!url) {
    throw new Error('Set CLICKHOUSE_URL before backfilling.')
  }
  if (!databaseUrl) {
    throw new Error('Set DATABASE_URL before backfilling.')
  }

  const ch = createClient({
    url,
    database: process.env.CLICKHOUSE_DATABASE ?? 'keenpix',
    username: process.env.CLICKHOUSE_USER ?? 'default',
    password: process.env.CLICKHOUSE_PASSWORD ?? '',
  })
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  })

  await ch.command({ query: REQUEST_EVENTS_DDL })
  const truncate = process.argv.includes('--truncate')
  const force = process.argv.includes('--force')
  if (truncate) {
    await ch.command({ query: 'TRUNCATE TABLE request_events' })
    process.stdout.write('truncated request_events\n')
  } else if (!force) {
    // Guard: plain MergeTree never dedups, so appending onto a populated table
    // double-counts. Bail unless the operator explicitly opted into --truncate or
    // --force.
    const existing = await ch.query({
      query: 'SELECT count() AS c FROM request_events',
      format: 'JSONEachRow',
    })
    const [row] = await existing.json<{ c: string }>()
    const count = Number(row?.c ?? 0)
    if (count > 0) {
      throw new Error(
        `request_events already has ${count} rows. Re-running would double-count (plain MergeTree does not dedup). Re-run with --truncate for a clean rebuild, or --force to append anyway. Stop the app's live tee first.`,
      )
    }
  }

  let cursor: string | null = null
  let total = 0
  for (;;) {
    const rows: DbLog[] = await prisma.requestLog.findMany({
      take: BATCH,
      orderBy: { id: 'asc' },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })
    if (rows.length === 0) {
      break
    }
    await ch.insert({
      table: 'request_events',
      values: rows.map(toRow),
      format: 'JSONEachRow',
    })
    total += rows.length
    cursor = rows.at(-1)?.id ?? null
    process.stdout.write(`backfilled ${total}\n`)
  }

  await ch.close()
  await prisma.$disconnect()
  process.stdout.write(`done: ${total} events backfilled\n`)
}

main().catch((error) => {
  process.stderr.write(`${String(error)}\n`)
  process.exit(1)
})
