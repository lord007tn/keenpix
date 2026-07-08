import { env } from '@/env/server'

export interface ClickhouseConfig {
  database: string
  password: string
  url: string
  username: string
}

// ClickHouse powers the advanced analytics + full-history advanced-logs tier by
// mirroring raw request events into a columnar store. It is entirely optional:
// active only when CLICKHOUSE_URL is configured. When it returns null, every
// caller falls back to Postgres, so self-host and un-provisioned cloud behave
// exactly as before (this whole subsystem is a compile-time-present no-op).
export function getClickhouseConfig(): ClickhouseConfig | null {
  if (!env.CLICKHOUSE_URL) {
    return null
  }
  return {
    url: env.CLICKHOUSE_URL,
    database: env.CLICKHOUSE_DATABASE,
    username: env.CLICKHOUSE_USER,
    password: env.CLICKHOUSE_PASSWORD ?? '',
  }
}

export function clickhouseEnabled(): boolean {
  return getClickhouseConfig() !== null
}
