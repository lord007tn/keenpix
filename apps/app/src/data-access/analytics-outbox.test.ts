import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  record: vi.fn(),
  rows: [] as Record<string, unknown>[],
}))
const db = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  analyticsEventOutbox: {
    count: vi.fn(),
    deleteMany: vi.fn(),
    findMany: vi.fn(),
  },
  requestLog: { createMany: vi.fn() },
}))

vi.mock('@keenpix/database', () => ({
  prisma: {
    $transaction: (work: (client: typeof db) => unknown) => work(db),
  },
}))
vi.mock('@keenpix/database/activation', () => ({
  recordProjectFirstImageSuccesses: mocks.record,
}))
vi.mock('@/data-access/analytics-rollups', () => ({
  aggregateRollupIncrements: () => [],
  applyRollupIncrement: vi.fn(),
}))

import {
  drainAnalyticsOutboxBatch,
  drainProjectAnalyticsOutbox,
} from './analytics-outbox'

const through = new Date('2026-10-02T00:00:00Z')
const event = {
  activationCandidate: true,
  bytesOut: 12,
  id: 'event',
  orgId: 'organization',
  projectId: 'project',
  sourceHost: 'images.customer.test',
  status: 200,
  ts: new Date('2026-10-01T00:00:00Z'),
}

describe('analytics outbox first-image capture', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db.$queryRaw.mockResolvedValue([{ locked: true }])
    db.analyticsEventOutbox.count.mockResolvedValue(0)
    db.analyticsEventOutbox.findMany.mockImplementation(async () => mocks.rows)
  })

  it('derives the external bit from the persisted host in one statement', async () => {
    mocks.rows = [
      { ...event, id: 'external' },
      { ...event, id: 'owned', sourceHost: 'CDN.Keenpix.com' },
      { ...event, id: 'app', sourceHost: 'app.example.test' },
      { ...event, id: 'unknown', sourceHost: null },
    ]
    await drainAnalyticsOutboxBatch(through, 'https://app.example.test')
    expect(mocks.record).toHaveBeenCalledExactlyOnceWith(
      [true, false, false, false].map((external) => ({
        external,
        observedAt: event.ts,
        orgId: 'organization',
        projectId: 'project',
      })),
      db,
    )
  })

  it('never turns an unmarked, failed, or empty event into a candidate', async () => {
    mocks.rows = [
      { ...event, activationCandidate: false },
      { ...event, status: 404 },
      { ...event, bytesOut: 0 },
    ]
    await drainAnalyticsOutboxBatch(through, 'https://app.example.test')
    expect(mocks.record).not.toHaveBeenCalled()
    expect(db.analyticsEventOutbox.deleteMany).toHaveBeenCalledOnce()
  })

  it('proves no external source when the caller has no app origin', async () => {
    mocks.rows = [event]
    await drainAnalyticsOutboxBatch(through)
    await drainProjectAnalyticsOutbox(db as never, 'project')
    expect(mocks.record).toHaveBeenCalledTimes(2)
    for (const [candidates] of mocks.record.mock.calls) {
      expect(candidates).toEqual([expect.objectContaining({ external: false })])
    }
  })
})
