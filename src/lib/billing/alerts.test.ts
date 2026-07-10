import { describe, expect, it, vi } from 'vitest'
import { TRIAL } from './plans'

vi.mock('@/server/deployment', () => ({
  isCloud: () => true,
  getAppUrl: () => 'https://keenpix.com',
}))
vi.mock('@/data-access/billing-alerts', () => ({
  claimBillingAlert: vi.fn(),
  listAlertableSubscriptions: vi.fn(),
  listBillingRecipients: vi.fn(),
}))
vi.mock('@/data-access/usage', () => ({ deliveredBytesSince: vi.fn() }))
vi.mock('@/lib/email/send', () => ({ sendPlatformEmail: vi.fn() }))
vi.mock('@/lib/logger/logger', () => ({
  logger: { error: vi.fn() },
  errorContext: (error: unknown) => ({ error }),
}))

const { usageAlertsFor } = await import('./alerts')

const GB = 1024 ** 3

function sub(overrides: Record<string, unknown> = {}) {
  return {
    orgId: 'org_a',
    plan: 'basic', // 100 GB included, 8¢/GB overage
    status: 'active',
    spendCapCents: 1800, // $18 = default 2x Basic
    currentPeriodStart: new Date('2026-07-01T00:00:00Z'),
    organization: { name: 'Acme' },
    ...overrides,
  }
}

describe('usageAlertsFor', () => {
  it('stays quiet under 80% of the included allowance', () => {
    expect(usageAlertsFor(sub(), 50 * GB)).toEqual([])
  })

  it('fires the 80% warning between 80% and 100%', () => {
    const kinds = usageAlertsFor(sub(), 85 * GB).map((alert) => alert.kind)
    expect(kinds).toEqual(['usage_80'])
  })

  it('fires the 100% alert (not the 80% one) once past the allowance', () => {
    const kinds = usageAlertsFor(sub(), 120 * GB).map((alert) => alert.kind)
    expect(kinds).toEqual(['usage_100'])
  })

  it('adds cap_reached when overage cost hits the spending cap', () => {
    // Basic 8¢/GB: $18 cap → 225 GB overage → 100 included + 225 = 325 GB.
    const kinds = usageAlertsFor(sub(), 326 * GB).map((alert) => alert.kind)
    expect(kinds).toEqual(['usage_100', 'cap_reached'])
  })

  it('never fires cap_reached without a cap', () => {
    const kinds = usageAlertsFor(sub({ spendCapCents: null }), 1000 * GB).map(
      (alert) => alert.kind,
    )
    expect(kinds).toEqual(['usage_100'])
  })

  it('meters a trial against the trial allowance with trial-specific copy', () => {
    const trial = sub({ status: 'trialing' })
    expect(usageAlertsFor(trial, 10 * GB)).toEqual([])
    const at80 = usageAlertsFor(trial, TRIAL.bandwidthBytes * 0.8)
    expect(at80.map((alert) => alert.kind)).toEqual(['trial_allowance_80'])
    const atCap = usageAlertsFor(trial, TRIAL.bandwidthBytes)
    expect(atCap.map((alert) => alert.kind)).toEqual([
      'trial_allowance_reached',
    ])
    expect(atCap[0]?.text).toContain('never billed')
  })

  it('returns nothing for an unknown plan', () => {
    expect(usageAlertsFor(sub({ plan: 'mystery' }), 500 * GB)).toEqual([])
  })
})
