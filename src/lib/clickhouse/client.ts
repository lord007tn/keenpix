import { type ClickHouseClient, createClient } from '@clickhouse/client'
import { getClickhouseConfig } from './config'

let cached: ClickHouseClient | null | undefined

// Memoized ClickHouse client, or null when unconfigured. Built lazily so that
// importing this module never opens a connection in Postgres-only deployments;
// `undefined` = "not yet resolved", `null` = "resolved, disabled".
export function getClickhouseClient(): ClickHouseClient | null {
  if (cached !== undefined) {
    return cached
  }
  const config = getClickhouseConfig()
  cached = config
    ? createClient({
        url: config.url,
        database: config.database,
        username: config.username,
        password: config.password,
      })
    : null
  return cached
}
