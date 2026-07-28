import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  new URL('./migrate-joodlab-legacy-to-cloud.ts', import.meta.url),
  'utf8',
)

describe('legacy-to-cloud migration contract', () => {
  it('requires a bounded delta window', () => {
    expect(source).toContain("requireEnv('MIGRATION_SINCE_AT')")
    expect(source).toContain("requireEnv('MIGRATION_CUTOVER_AT')")
    expect(source).toContain(
      'MIGRATION_SINCE_AT must be before MIGRATION_CUTOVER_AT.',
    )
    expect(source).toContain('"orgId" = $1 and ts >= $2 and ts < $3')
    expect(source).toContain('"bucketStart" >= $2 and "bucketStart" < $3')
    expect(source).toContain('"createdAt" >= $2 and "createdAt" < $3')
  })

  it('requires an explicit read or write mode', () => {
    expect(source).toContain(
      "const MIGRATION_MODE = requireEnv('MIGRATION_MODE')",
    )
    expect(source).toContain("MIGRATION_MODE === 'dry-run'")
    expect(source).toContain(
      "'MIGRATION_MODE must be either dry-run or execute.'",
    )
    expect(source).not.toContain("process.argv.includes('--dry-run')")
  })

  it('binds declared releases to applied database schemas', () => {
    expect(source).toContain("requireEnv('SOURCE_SCHEMA_MIGRATION')")
    expect(source).toContain("requireEnv('TARGET_SCHEMA_MIGRATION')")
    expect(source).toContain('must be a full 40-character Git commit SHA')
    expect(source).toContain('verifySchemaMigration')
    expect(source).toContain('and rolled_back_at is null')
  })

  it('synchronizes the complete mutable API-key state', () => {
    for (const field of [
      '"refillInterval"',
      '"refillAmount"',
      '"lastRefillAt"',
      '"rateLimitEnabled"',
      '"rateLimitTimeWindow"',
      '"rateLimitMax"',
      '"requestCount"',
      'remaining',
      '"lastRequest"',
      '"expiresAt"',
    ]) {
      expect(source).toContain(`${field} = excluded.${field}`)
    }
  })

  it('excludes cloud-only activity from the target fingerprint', () => {
    expect(source).toContain(
      '"apiKeyId" = any($1) and "createdAt" >= $2 and "createdAt" < $3 and id <> all($4::text[])',
    )
    expect(source).toContain(
      '[SOURCE_API_KEY_IDS, since, cutover, targetOnlyActivityIds]',
    )
  })

  it('fails closed on ambiguous rollup collisions', () => {
    expect(source).toContain('countRollupKeyCollisions')
    expect(source).toContain(
      'cloud-only hourly rollups overlap legacy dimension keys',
    )
  })

  it('uses indexed time keysets when comparing source and target IDs', () => {
    expect(source).toContain('orderColumn: string')
    expect(source).toContain("orderColumn: 'ts'")
    expect(source).toContain("orderColumn: 'bucketStart'")
    expect(source).toContain("orderColumn: 'createdAt'")
    expect(source).toContain('quoteIdent(input.orderColumn)}, id')
  })

  it('requires the mapped target account to own the organization', () => {
    expect(source).toContain("requireEnv('SOURCE_USER_DISPOSITIONS')")
    expect(source).toContain('SOURCE_USER_DISPOSITIONS coverage mismatch')
    expect(source).toContain('Mapped cloud membership or role does not match')
    expect(source).toContain("and m.role = 'owner'")
  })
})
