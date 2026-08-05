import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  new URL('./backfill-clickhouse.ts', import.meta.url),
  'utf8',
)

describe('ClickHouse backfill contract', () => {
  it('requires an explicit backfill mode', () => {
    expect(source).toContain('CLICKHOUSE_BACKFILL_MODE')
    expect(source).toContain("'force', 'truncate', 'verify-empty'")
    expect(source).not.toContain("process.argv.includes('--truncate')")
    expect(source).not.toContain("process.argv.includes('--force')")
  })

  it('reconciles PostgreSQL rows and unique ClickHouse event IDs', () => {
    expect(source).toContain('await prisma.requestLog.count()')
    expect(source).toContain('uniqExact(id) AS uniqueIds')
    expect(source).toContain('ClickHouse reconciliation failed')
  })
})
