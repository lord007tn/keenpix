import { getClickhouseClient } from './client'

// Run a parameterized SELECT and return typed rows, or [] when ClickHouse is
// unconfigured. Mirrors joodcms' JSONEachRow read helper — every caller stays a
// no-op in Postgres-only deployments (the caller then falls back to Postgres).
export async function queryRows<T>(
  query: string,
  params?: Record<string, unknown>,
): Promise<T[]> {
  const client = getClickhouseClient()
  if (!client) {
    return []
  }
  const result = await client.query({
    query,
    query_params: params,
    format: 'JSONEachRow',
    // Emit UInt64/Int64 (count()/sum() results) as JSON numbers, not strings, so
    // aggregates deserialize as numbers. Values stay well under 2^53 here.
    clickhouse_settings: { output_format_json_quote_64bit_integers: 0 },
  })
  return result.json<T>()
}
