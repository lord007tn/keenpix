import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const locked = vi.hoisted(() => ({ value: true }))
const transactionSpy = vi.hoisted(() => vi.fn())
vi.mock('@/db', () => ({
  prisma: {
    $transaction: transactionSpy.mockImplementation(
      (fn: (tx: unknown) => unknown) =>
        Promise.resolve(
          fn({
            $queryRaw: vi.fn().mockResolvedValue([{ locked: locked.value }]),
          }),
        ),
    ),
  },
}))

const listUsageBillingCustomers = vi.hoisted(() => vi.fn())
const listTrialingOrgIds = vi.hoisted(() => vi.fn())
const deliveredBytesSince = vi.hoisted(() => vi.fn())
const markUsageReported = vi.hoisted(() => vi.fn())
vi.mock('@/data-access/usage', () => ({
  listUsageBillingCustomers,
  listTrialingOrgIds,
  deliveredBytesSince,
  markUsageReported,
}))

vi.mock('@/env/server', () => ({
  env: { POLAR_TOKEN: 'test-token', POLAR_SERVER: 'sandbox' },
}))
vi.mock('@/server/deployment', () => ({ isCloud: () => true }))
vi.mock('@/lib/logger/logger', () => ({
  logger: { error: vi.fn() },
  errorContext: (error: unknown) => ({ error }),
}))

const { reportUsage } = await import('./usage-reporter')

const GB = 1024 ** 3
const SINCE = new Date('2026-07-10T09:00:00Z')
const THROUGH = new Date('2026-07-10T10:00:00Z')

function customer(orgId: string, lastUsageReportAt: Date | null = SINCE) {
  return { orgId, polarCustomerId: `cus_${orgId}`, lastUsageReportAt }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-07-10T11:30:00Z'))
  locked.value = true
  listTrialingOrgIds.mockResolvedValue([])
  deliveredBytesSince.mockImplementation(
    (_orgId: string, _since: Date, through: Date) =>
      Promise.resolve({ bytes: 2 * GB, through }),
  )
  markUsageReported.mockResolvedValue({})
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('reportUsage', () => {
  it('advances only the successfully ingested orgs when one org fails mid-run', async () => {
    listUsageBillingCustomers.mockResolvedValue([
      customer('org_a'),
      customer('org_b'),
      customer('org_c'),
    ])
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: { body: string }) => {
        const failed = init.body.includes('cus_org_b')
        return Promise.resolve({
          ok: !failed,
          status: failed ? 500 : 200,
          text: () => Promise.resolve('boom'),
        })
      }),
    )

    const result = await reportUsage()

    // org_b's watermark must NOT advance (its window retries next run); org_a
    // and org_c must stay marked even though org_b failed after org_a succeeded.
    const markedOrgs = markUsageReported.mock.calls.map((call) => call[0])
    expect(markedOrgs).toEqual(['org_a', 'org_c'])
    expect(markUsageReported).toHaveBeenCalledWith('org_a', THROUGH)
    expect(result).toEqual({ failed: 1, ingested: 2, orgs: 3, skipped: false })
  })

  it('advances the watermark without ingesting when an org delivered nothing', async () => {
    listUsageBillingCustomers.mockResolvedValue([customer('org_a')])
    deliveredBytesSince.mockResolvedValue({ bytes: 0, through: THROUGH })
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const result = await reportUsage()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(markUsageReported).toHaveBeenCalledWith('org_a', THROUGH)
    expect(result).toEqual({ failed: 0, ingested: 0, orgs: 1, skipped: false })
  })

  it('uses a stable Polar event id when a watermark write must be retried', async () => {
    listUsageBillingCustomers.mockResolvedValue([customer('org_a')])
    const fetchSpy = vi.fn((_url: string, _init: { body: string }) =>
      Promise.resolve({ ok: true, status: 200 }),
    )
    vi.stubGlobal('fetch', fetchSpy)
    markUsageReported
      .mockRejectedValueOnce(new Error('database unavailable'))
      .mockResolvedValueOnce({})

    expect(await reportUsage()).toMatchObject({ failed: 1, ingested: 1 })
    vi.setSystemTime(new Date('2026-07-10T12:30:00Z'))
    expect(await reportUsage()).toMatchObject({ failed: 0, ingested: 2 })

    const eventIds = fetchSpy.mock.calls.map(([, init]) => {
      const body = JSON.parse(init.body)
      return body.events[0].external_id
    })
    expect(eventIds).toEqual([
      'keenpix:bandwidth:org_a:2026-07-10T09:00:00.000Z:2026-07-10T10:00:00.000Z',
      'keenpix:bandwidth:org_a:2026-07-10T09:00:00.000Z:2026-07-10T10:00:00.000Z',
      'keenpix:bandwidth:org_a:2026-07-10T10:00:00.000Z:2026-07-10T11:00:00.000Z',
    ])
  })

  it('does not bill a legacy customer whose lower watermark is unknown', async () => {
    listUsageBillingCustomers.mockResolvedValue([customer('org_a', null)])
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const result = await reportUsage()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(markUsageReported).toHaveBeenCalledWith('org_a', THROUGH)
    expect(result).toMatchObject({ failed: 0, ingested: 0 })
  })

  it('leaves the just-closed hour open for late delivery increments', async () => {
    vi.setSystemTime(new Date('2026-07-10T10:00:00Z'))
    listUsageBillingCustomers.mockResolvedValue([customer('org_a')])

    const result = await reportUsage()

    expect(deliveredBytesSince).not.toHaveBeenCalled()
    expect(markUsageReported).not.toHaveBeenCalled()
    expect(result).toEqual({ failed: 0, ingested: 0, orgs: 1, skipped: false })
  })

  it('never bills a trialing org but still advances its watermark', async () => {
    listUsageBillingCustomers.mockResolvedValue([
      customer('org_trial'),
      customer('org_paid'),
    ])
    listTrialingOrgIds.mockResolvedValue(['org_trial'])
    const fetchSpy = vi.fn(() => Promise.resolve({ ok: true, status: 200 }))
    vi.stubGlobal('fetch', fetchSpy)

    const result = await reportUsage()

    // Only the paid org reaches Polar; the trial org's window is consumed (not
    // deferred), so conversion is billed from the trial's end, never before.
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect((fetchSpy.mock.calls[0] as unknown[])[1]).toMatchObject({
      body: expect.stringContaining('cus_org_paid'),
    })
    const markedOrgs = markUsageReported.mock.calls.map((call) => call[0])
    expect(markedOrgs).toEqual(['org_trial', 'org_paid'])
    expect(result).toEqual({ failed: 0, ingested: 1, orgs: 2, skipped: false })
  })

  it('skips entirely when another replica holds the advisory lock', async () => {
    locked.value = false
    listUsageBillingCustomers.mockResolvedValue([customer('org_a')])

    const result = await reportUsage()

    expect(result.skipped).toBe(true)
    expect(markUsageReported).not.toHaveBeenCalled()
  })
})
