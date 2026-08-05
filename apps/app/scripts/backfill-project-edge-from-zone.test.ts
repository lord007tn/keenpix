import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  new URL('./backfill-project-edge-from-zone.ts', import.meta.url),
  'utf8',
)
const dockerfile = readFileSync(
  new URL('../Dockerfile', import.meta.url),
  'utf8',
)

describe('legacy project Edge backfill contract', () => {
  it('is read-only by default and requires an explicit exclusivity assertion', () => {
    expect(source).toContain("?? 'plan'")
    expect(source).toContain(
      'PROJECT_EDGE_BACKFILL_MODE must be plan or execute',
    )
    expect(source).toContain(
      'PROJECT_EDGE_BACKFILL_ACKNOWLEDGE_EXCLUSIVE_PROJECT',
    )
    expect(source).toContain("===\n  'yes'")
  })

  it('copies only missing Cloudflare offloads before a non-overlapping cutoff', () => {
    expect(source).toContain(
      "const EDGE_OFFLOAD_STATUSES = ['hit', 'ignored', 'stale', 'updating']",
    )
    expect(source).toContain('bucketStart: { lt: cutoff.toDate() }')
    expect(source).toContain("stage: 'edge'")
    expect(source).toContain(
      'cutoff.isAfter(dayjs(trustedStart._min.bucketStart))',
    )
  })

  it('uses stable IDs and reconciles rows, requests, and bytes', () => {
    expect(source).toContain("const LEGACY_ID_PREFIX = 'legacy-zone:'")
    expect(source).toContain('skipDuplicates: true')
    expect(source).toContain('Backfill reconciliation failed')
    expect(source).toContain('actualBytes !== expected.bytes')
    expect(source).toContain('actualRequests !== expected.requests')
  })

  it('is available in the production operator image', () => {
    expect(source).not.toContain("import 'dotenv/config'")
    expect(dockerfile).toContain('COPY --from=prod-deps /app /app')
  })
})
