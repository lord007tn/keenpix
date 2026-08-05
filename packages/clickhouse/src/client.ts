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

// Best-effort readiness probe for the health endpoint. Returns null when
// ClickHouse isn't configured (Postgres-only deployment); otherwise a reachable
// flag. Never throws.
export async function pingClickhouse(): Promise<{
  ok: boolean
  latencyMs: number
} | null> {
  const client = getClickhouseClient()
  if (!client) {
    return null
  }
  const start = performance.now()
  try {
    const result = await client.ping()
    return {
      ok: result.success === true,
      latencyMs: Math.round(performance.now() - start),
    }
  } catch {
    return { ok: false, latencyMs: Math.round(performance.now() - start) }
  }
}
